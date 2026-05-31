import { Command } from 'commander';
import { commitAction } from './commands/commit.js';
import { prAction } from './commands/pr.js';
import { executeScan } from './commands/security.js';
import { hasStagedFiles, getStagedDiff } from './utils/git.js';
import { loadConfig } from './utils/config.js';
import chalk from 'chalk';

export const program = new Command();

program
  .name('gitglow')
  .description('Premium AI-Powered Git & PR Automation CLI')
  .version('1.0.0');

program
  .command('commit')
  .description('Analyze staged changes and generate an AI-powered conventional commit message.')
  .option('--force-mock', 'Force mock response for offline/keyless testing')
  .action(async (options) => {
    await commitAction(options);
  });

program
  .command('scan')
  .description('Run security shield to scan staged changes for high-risk credentials.')
  .action(() => {
    if (!hasStagedFiles()) {
      console.log(chalk.yellow('⚠ No staged files found. Please use "git add" to stage changes before scanning.'));
      return;
    }
    const diff = getStagedDiff();
    const config = loadConfig();
    const success = executeScan(diff, config);
    if (!success) {
      process.exit(1);
    }
  });

program
  .command('pr <baseBranch>')
  .description('Synthesize a beautiful AI-powered Pull Request description.')
  .option('--force-mock', 'Force mock response for offline/keyless testing')
  .action(async (baseBranch, options) => {
    await prAction(baseBranch, options);
  });
