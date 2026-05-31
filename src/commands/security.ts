import { GitGlowConfig } from '../types/index.js';
import chalk from 'chalk';

export interface SecurityViolation {
  patternName: string;
  lineContent: string;
  fileName?: string;
}

export function runSecurityScan(diff: string, config: GitGlowConfig): SecurityViolation[] {
  const violations: SecurityViolation[] = [];
  const lines = diff.split('\n');
  let currentFile = 'Unknown';
  let shouldSkipFile = false;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.+)$/);
      currentFile = match ? match[1] : 'Unknown';
      
      // Exclude binary files, lockfiles, and media files from expensive scans
      shouldSkipFile = /\.(png|jpg|jpeg|gif|ico|pdf|zip|gz|tar|mp4|mp3|woff|woff2|eot|ttf|lock|map)$|(-lock\.json)$|^node_modules\//.test(currentFile);
      continue;
    }

    if (shouldSkipFile) {
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      const lineContent = line.substring(1);
      for (const pattern of config.securityPatterns) {
        const regex = new RegExp(pattern.regex, 'g');
        if (regex.test(lineContent)) {
          violations.push({
            patternName: pattern.name,
            lineContent: lineContent.trim(),
            fileName: currentFile
          });
        }
      }
    }
  }
  return violations;
}

export function executeScan(diff: string, config: GitGlowConfig): boolean {
  const violations = runSecurityScan(diff, config);
  if (violations.length > 0) {
    console.error(chalk.red.bold('\n[SECURITY AUDITOR] CRITICAL CREDENTIAL LEAK PREVENTED!'));
    console.error(chalk.red('High-risk secrets or keys staged for commit. Process halted.\n'));
    violations.forEach(v => {
      console.error(
        chalk.yellow(`- Exposed [${v.patternName}] in file `) +
        chalk.cyan(`[${v.fileName || 'Unknown'}]`) +
        chalk.yellow(': ') +
        chalk.bgRed.black(` ${v.lineContent.substring(0, 20)}... `)
      );
    });
    console.error(chalk.cyan('\nPlease clean up exposed secrets before committing changes.\n'));
    return false;
  }
  console.log(chalk.green('✓ Security audit passed. No credentials detected.'));
  return true;
}
