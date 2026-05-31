import { execSync } from 'child_process';

export function hasStagedFiles(): boolean {
  try {
    const status = execSync('git status --porcelain', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim();
    // Check if there are any lines starting with M, A, D, R, C (index status changes)
    return status.split('\n').some(line => /^[MADRC]/.test(line));
  } catch {
    return false;
  }
}

export function getStagedDiff(): string {
  try {
    return execSync('git diff --cached', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

export function getBranchDiff(baseBranch: string): { diff: string; commits: string } {
  try {
    const diff = execSync(`git diff ${baseBranch}...HEAD`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    const commits = execSync(`git log ${baseBranch}..HEAD --oneline`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    return { diff, commits };
  } catch {
    return { diff: '', commits: '' };
  }
}

export function makeCommit(message: string): void {
  execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: 'inherit' });
}
