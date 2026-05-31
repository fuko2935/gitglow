/**
 * GitGlow CLI router.
 * Registers all commands and delegates to action handlers.
 * All process.exit() calls are centralised here.
 */
import { Command } from 'commander';
import { commitAction } from './commands/commit.js';
import { prAction } from './commands/pr.js';
import { executeScan } from './commands/security.js';
import { hasStagedFiles, getStagedDiff } from './utils/git.js';
import { loadConfig } from './utils/config.js';
import chalk from 'chalk';
import { GitError } from './types/index.js';

export const program = new Command();

program
  .name('gitglow')
  .description('AI-assisted git commit messages, PR descriptions, and staged secret scanning.')
  .version('1.0.0');

// ---------------------------------------------------------------------------
// gitglow commit
// ---------------------------------------------------------------------------
program
  .command('commit')
  .description('Analyze staged changes and generate a Conventional Commit message.')
  .option('--force-mock', 'Force mock response (same as --no-ai)')
  .option('--no-ai', 'Skip AI – use offline mock generator')
  .option('--yes', 'Non-interactive: commit directly with the generated message')
  .option('--dry-run', 'Print the generated message without committing')
  .action(async (options: { forceMock?: boolean; noAi?: boolean; yes?: boolean; dryRun?: boolean }) => {
    try {
      await commitAction({
        forceMock: options.forceMock,
        noAi: options.noAi,
        yes: options.yes,
        dryRun: options.dryRun,
      });
    } catch (err) {
      if (err instanceof GitError) {
        console.error(chalk.red(`✗ Git error: ${err.message}`));
      } else {
        console.error(chalk.red('✗ Unexpected error:'), err);
      }
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// gitglow scan
// ---------------------------------------------------------------------------
program
  .command('scan')
  .description('Scan staged changes for hardcoded secrets and high-risk credentials.')
  .option('--json', 'Output results as JSON (suitable for CI pipelines)')
  .action((options: { json?: boolean }) => {
    try {
      if (!hasStagedFiles()) {
        const msg = 'No staged files found. Use `git add <file>` to stage changes first.';
        if (options.json) {
          console.log(JSON.stringify({ violations: [], clean: true, message: msg }));
        } else {
          console.log(chalk.yellow(`⚠  ${msg}`));
        }
        process.exit(0);
      }
      const config = loadConfig();
      const { diff } = getStagedDiff(config.maxDiffBytes ?? 20_000);
      const clean = executeScan(diff, config, options.json);
      process.exit(clean ? 0 : 1);
    } catch (err) {
      if (err instanceof GitError) {
        console.error(chalk.red(`✗ Git error: ${err.message}`));
      } else {
        console.error(chalk.red('✗ Unexpected error:'), err);
      }
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// gitglow pr <baseBranch>
// ---------------------------------------------------------------------------
program
  .command('pr <baseBranch>')
  .description(
    'Generate a Pull Request description comparing <baseBranch> to the current branch.',
  )
  .option('--force-mock', 'Force mock response (same as --no-ai)')
  .option('--no-ai', 'Skip AI – use offline mock generator')
  .option('--no-clipboard', 'Do not copy the PR description to the clipboard')
  .option('--output <file>', 'Write the PR description to a file')
  .option('--dry-run', 'Print the description without writing to file or clipboard')
  .action(
    async (
      baseBranch: string,
      options: {
        forceMock?: boolean;
        noAi?: boolean;
        noClipboard?: boolean;
        output?: string;
        dryRun?: boolean;
      },
    ) => {
      try {
        await prAction(baseBranch, {
          forceMock: options.forceMock,
          noAi: options.noAi,
          noClipboard: options.noClipboard,
          output: options.output,
          dryRun: options.dryRun,
        });
      } catch (err) {
        if (err instanceof GitError) {
          console.error(chalk.red(`✗ Git error: ${err.message}`));
        } else {
          console.error(chalk.red('✗ Unexpected error:'), err);
        }
        process.exit(1);
      }
    },
  );
