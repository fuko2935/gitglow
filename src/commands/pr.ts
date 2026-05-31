import chalk from 'chalk';
import ora from 'ora';
import clipboardy from 'clipboardy';
import { getBranchDiff } from '../utils/git.js';
import { loadConfig } from '../utils/config.js';
import { generatePRDescription } from '../utils/openai.js';

export async function prAction(baseBranch: string, options: { forceMock?: boolean }): Promise<void> {
  const { diff, commits } = getBranchDiff(baseBranch);
  
  if (!diff) {
    console.log(chalk.yellow(`⚠ No modifications found between ${baseBranch} and active branch.`));
    return;
  }

  const config = loadConfig();
  const spinner = ora(`Comparing branches and synthesizing beautiful PR details...`).start();

  try {
    const isMock = options.forceMock || process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY;
    const prMarkdown = await generatePRDescription(diff, commits, config, isMock);
    spinner.succeed('PR summary synthesis complete.');

    console.log(chalk.cyan.bold('\n--- Suggested PR Description (Markdown) ---'));
    console.log(prMarkdown);
    console.log(chalk.cyan.bold('-------------------------------------------\n'));

    try {
      clipboardy.writeSync(prMarkdown);
      console.log(chalk.green.bold('✓ PR description copied automatically to your clipboard! Ready to paste into GitHub.'));
    } catch {
      console.log(chalk.yellow('⚠ Clipboard integration failed. Please copy the PR description above manually.'));
    }
  } catch (error) {
    spinner.fail('Failed to synthesize PR details.');
    console.error(error);
  }
}
