import { GitGlowConfig } from '../types/index.js';
import chalk from 'chalk';

export interface SecurityViolation {
  patternName: string;
  lineContent: string;
}

export function runSecurityScan(diff: string, config: GitGlowConfig): SecurityViolation[] {
  const violations: SecurityViolation[] = [];
  const lines = diff.split('\n');

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const lineContent = line.substring(1);
      for (const pattern of config.securityPatterns) {
        const regex = new RegExp(pattern.regex, 'g');
        if (regex.test(lineContent)) {
          violations.push({
            patternName: pattern.name,
            lineContent: lineContent.trim()
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
    console.error(chalk.red.bold('\n[SECURITY SHIELD] CRITICAL VULNERABILITY DETECTED!'));
    console.error(chalk.red('High-risk credentials staged for commit. Process halted.\n'));
    violations.forEach(v => {
      console.error(chalk.yellow(`- Detected: [${v.patternName}] in code: `) + chalk.bgRed.black(` ${v.lineContent.substring(0, 15)}... `));
    });
    console.error(chalk.cyan('\nPlease clean up secrets before committing staged changes.\n'));
    return false;
  }
  console.log(chalk.green('✓ Security scan passed. No secrets detected.'));
  return true;
}
