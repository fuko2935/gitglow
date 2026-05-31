/**
 * Safe git utilities.
 *
 * All git commands use execFileSync with explicit argument arrays to prevent
 * shell injection. No user-controlled strings are ever interpolated into a
 * shell command string.
 */
import { execFileSync } from 'child_process';
import { GitError, BranchDiffResult, StagedDiffResult } from '../types/index.js';

const GIT = 'git';
const EXEC_OPTS = { stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'] };

/** Wrap execFileSync to produce GitError on failure */
function runGit(args: string[], opts?: { maxBuffer?: number }): string {
  try {
    return execFileSync(GIT, args, {
      ...EXEC_OPTS,
      maxBuffer: opts?.maxBuffer ?? 10 * 1024 * 1024, // 10 MB default
    })
      .toString()
      .trim();
  } catch (err: unknown) {
    const cmd = `git ${args.join(' ')}`;
    // Extract stderr from the error for a useful message
    const stderr =
      err instanceof Error && 'stderr' in err
        ? String((err as NodeJS.ErrnoException & { stderr?: Buffer }).stderr ?? '')
        : '';

    // Provide actionable messages for common failure cases
    if (stderr.includes('not a git repository')) {
      throw new GitError('Not a git repository. Run `git init` first.', cmd, err);
    }
    if (stderr.includes('unknown revision') || stderr.includes('bad revision')) {
      throw new GitError(
        `Branch or ref not found: "${args.find(a => a.includes('...') || a.includes('..'))}". ` +
          `Make sure the base branch exists and you have fetched it.`,
        cmd,
        err,
      );
    }
    if (stderr.includes('not found') || (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT')) {
      throw new GitError(
        'git executable not found. Please install git and ensure it is on your PATH.',
        cmd,
        err,
      );
    }
    throw new GitError(
      stderr.trim() || `git command failed: ${cmd}`,
      cmd,
      err,
    );
  }
}

/**
 * Validate that a branch/ref name is safe.
 * Uses `git check-ref-format` which is the canonical validator.
 * Throws GitError if the ref is invalid.
 */
export function validateBranchRef(ref: string): void {
  if (!ref || ref.trim() === '') {
    throw new GitError('Branch name must not be empty.', 'git check-ref-format');
  }
  // Disallow obviously dangerous characters even before git sees them
  // (belt-and-suspenders alongside execFileSync arg array safety)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f ~^:?*[\\`]/.test(ref)) {
    throw new GitError(
      `Invalid branch name: "${ref}" contains disallowed characters.`,
      'git check-ref-format',
    );
  }
  try {
    execFileSync(GIT, ['check-ref-format', '--branch', ref], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    throw new GitError(
      `"${ref}" is not a valid git branch name.`,
      `git check-ref-format --branch ${ref}`,
    );
  }
}

/**
 * Returns true if there are any staged files in the index.
 * Throws GitError on git failures (not-a-repo, no git, etc.)
 */
export function hasStagedFiles(): boolean {
  const status = runGit(['status', '--porcelain']);
  // Lines where the first column (index) is non-space and non-?
  return status.split('\n').some(line => /^[MADRC]/.test(line));
}

/**
 * Returns the staged diff (git diff --cached).
 * Truncates to maxBytes if specified.
 */
export function getStagedDiff(maxBytes = 0): StagedDiffResult {
  const raw = runGit(['diff', '--cached']);
  const sizeBytes = Buffer.byteLength(raw, 'utf8');
  const diff =
    maxBytes > 0 && sizeBytes > maxBytes
      ? raw.slice(0, maxBytes) + '\n\n[...diff truncated at ' + maxBytes + ' bytes...]'
      : raw;
  return { diff, sizeBytes };
}

/**
 * Returns the diff and commit list between baseBranch and HEAD.
 * baseBranch is validated before use; NO shell interpolation occurs.
 */
export function getBranchDiff(baseBranch: string, maxBytes = 0): BranchDiffResult {
  validateBranchRef(baseBranch);
  const rawDiff = runGit(['diff', `${baseBranch}...HEAD`]);
  const commits = runGit(['log', `${baseBranch}..HEAD`, '--oneline']);

  const sizeBytes = Buffer.byteLength(rawDiff, 'utf8');
  const diff =
    maxBytes > 0 && sizeBytes > maxBytes
      ? rawDiff.slice(0, maxBytes) + '\n\n[...diff truncated at ' + maxBytes + ' bytes...]'
      : rawDiff;

  return { diff, commits };
}

/**
 * Creates a git commit with the given message.
 * Uses execFileSync with argument array – no shell interpolation.
 */
export function makeCommit(message: string): void {
  // execFileSync passes message as a literal argument – no shell parsing
  execFileSync(GIT, ['commit', '-m', message], { stdio: 'inherit' });
}
