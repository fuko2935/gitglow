import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { hasStagedFiles, getStagedDiff, makeCommit } from '../utils/git.js';
import { executeScan } from './security.js';
import { loadConfig } from '../utils/config.js';
import { generateCommitMessage } from '../utils/openai.js';

export async function commitAction(options: { forceMock?: boolean }): Promise<void> {
  if (!hasStagedFiles()) {
    console.log(chalk.yellow('⚠ No staged files found. Please use "git add" to stage changes before committing.'));
    return;
  }

  const diff = getStagedDiff();
  const config = loadConfig();

  // Run security check first
  if (!executeScan(diff, config)) {
    process.exit(1);
  }

  const spinner = ora('Glow AI is analyzing code diffs and drafting commit message...').start();
  try {
    const isMock = options.forceMock || process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY;
    const aiMessage = await generateCommitMessage(diff, config, isMock);
    spinner.succeed('Glow AI analysis complete.');

    console.log(chalk.cyan.bold('\n--- Suggested Commit Message ---'));
    console.log(chalk.green(aiMessage));
    console.log(chalk.cyan.bold('---------------------------------\n'));

    const response = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do with this message?',
      choices: [
        { title: 'Commit staged files directly', value: 'commit' },
        { title: 'Manually edit message before commit', value: 'edit' },
        { title: 'Abort operation', value: 'abort' }
      ]
    });

    if (response.action === 'commit') {
      makeCommit(aiMessage);
      console.log(chalk.green.bold('✓ Staged files committed successfully. Code glowing!'));
    } else if (response.action === 'edit') {
      const editResponse = await prompts({
        type: 'text',
        name: 'customMessage',
        message: 'Edit commit message:',
        initial: aiMessage
      });
      if (editResponse.customMessage) {
        makeCommit(editResponse.customMessage);
        console.log(chalk.green.bold('✓ Custom message committed successfully. Code glowing!'));
      }
    } else {
      console.log(chalk.yellow('Commit operation cancelled.'));
    }
  } catch (error) {
    spinner.fail('Failed to generate commit suggestions.');
    console.error(error);
  }
}
