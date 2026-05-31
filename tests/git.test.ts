/**
 * Tests for git utilities.
 *
 * Key assertions:
 * - ALL git commands use execFileSync with an argument ARRAY (not string interpolation).
 * - validateBranchRef rejects dangerous inputs before they reach git.
 * - makeCommit passes the message as a discrete array element.
 * - GitError is thrown (not swallowed) on git failures.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execFileSync } from 'child_process';
import {
  hasStagedFiles,
  getStagedDiff,
  getBranchDiff,
  makeCommit,
  validateBranchRef,
} from '../src/utils/git.js';
import { GitError } from '../src/types/index.js';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

const mockExecFileSync = vi.mocked(execFileSync);

beforeEach(() => {
  mockExecFileSync.mockReset();
});

// ---------------------------------------------------------------------------
// hasStagedFiles
// ---------------------------------------------------------------------------
describe('hasStagedFiles', () => {
  it('returns true when index has modified files', () => {
    mockExecFileSync.mockReturnValue(Buffer.from('M  src/index.ts\n'));
    expect(hasStagedFiles()).toBe(true);
  });

  it('returns false when porcelain output is empty', () => {
    mockExecFileSync.mockReturnValue(Buffer.from(''));
    expect(hasStagedFiles()).toBe(false);
  });

  it('returns false when only untracked files are listed', () => {
    mockExecFileSync.mockReturnValue(Buffer.from('?? newfile.ts\n'));
    expect(hasStagedFiles()).toBe(false);
  });

  it('calls git with an argument array, not a shell string', () => {
    mockExecFileSync.mockReturnValue(Buffer.from(''));
    hasStagedFiles();
    const [cmd, args] = mockExecFileSync.mock.calls[0];
    expect(cmd).toBe('git');
    expect(Array.isArray(args)).toBe(true);
    expect(args).toContain('status');
    expect(args).toContain('--porcelain');
  });

  it('throws GitError when git is not available', () => {
    mockExecFileSync.mockImplementation(() => {
      const err = new Error('ENOENT');
      (err as NodeJS.ErrnoException).code = 'ENOENT';
      throw err;
    });
    expect(() => hasStagedFiles()).toThrow(GitError);
  });
});

// ---------------------------------------------------------------------------
// getStagedDiff
// ---------------------------------------------------------------------------
describe('getStagedDiff', () => {
  it('returns staged diff content', () => {
    mockExecFileSync.mockReturnValue(Buffer.from('diff --git ...'));
    const { diff } = getStagedDiff();
    expect(diff).toBe('diff --git ...');
  });

  it('truncates diff when maxBytes is set', () => {
    const longDiff = 'a'.repeat(500);
    mockExecFileSync.mockReturnValue(Buffer.from(longDiff));
    const { diff } = getStagedDiff(100);
    expect(diff.length).toBeLessThan(longDiff.length);
    expect(diff).toContain('[...diff truncated');
  });

  it('calls execFileSync with git diff --cached arg array', () => {
    mockExecFileSync.mockReturnValue(Buffer.from(''));
    getStagedDiff();
    const [cmd, args] = mockExecFileSync.mock.calls[0];
    expect(cmd).toBe('git');
    expect(Array.isArray(args)).toBe(true);
    expect(args).toContain('diff');
    expect(args).toContain('--cached');
    // Must NOT be a single shell string
    expect(typeof args).not.toBe('string');
  });
});

// ---------------------------------------------------------------------------
// validateBranchRef
// ---------------------------------------------------------------------------
describe('validateBranchRef', () => {
  it('accepts a valid branch name', () => {
    mockExecFileSync.mockReturnValue(Buffer.from(''));
    expect(() => validateBranchRef('main')).not.toThrow();
  });

  it('rejects an empty string without calling git', () => {
    expect(() => validateBranchRef('')).toThrow(GitError);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('rejects branch names with shell metacharacters without calling git', () => {
    expect(() => validateBranchRef('main; rm -rf /')).toThrow(GitError);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('rejects branch names with backtick injection without calling git', () => {
    expect(() => validateBranchRef('main`whoami`')).toThrow(GitError);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('throws GitError when git check-ref-format rejects the name', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('invalid ref');
    });
    expect(() => validateBranchRef('not..valid')).toThrow(GitError);
  });
});

// ---------------------------------------------------------------------------
// getBranchDiff
// ---------------------------------------------------------------------------
describe('getBranchDiff', () => {
  it('returns diff and commits', () => {
    mockExecFileSync
      .mockReturnValueOnce(Buffer.from('')) // check-ref-format
      .mockReturnValueOnce(Buffer.from('branch diff content'))
      .mockReturnValueOnce(Buffer.from('abc123 feat: add thing'));

    const result = getBranchDiff('main');
    expect(result.diff).toBe('branch diff content');
    expect(result.commits).toBe('abc123 feat: add thing');
  });

  it('calls git diff with an argument array containing the branch ref', () => {
    mockExecFileSync
      .mockReturnValueOnce(Buffer.from('')) // check-ref-format
      .mockReturnValueOnce(Buffer.from('diff'))
      .mockReturnValueOnce(Buffer.from('log'));

    getBranchDiff('feature/my-branch');

    // Find the call that includes 'diff' in args
    const diffCall = mockExecFileSync.mock.calls.find(
      ([, args]) => Array.isArray(args) && (args as string[]).includes('diff'),
    );
    expect(diffCall).toBeDefined();
    const [cmd, args] = diffCall!;
    expect(cmd).toBe('git');
    expect(Array.isArray(args)).toBe(true);
    // The branch name must appear as a discrete element, not interpolated
    expect((args as string[]).some(a => a.includes('feature/my-branch'))).toBe(true);
  });

  it('rejects an injection string before reaching git diff', () => {
    // Should throw before calling git diff at all
    expect(() => getBranchDiff('main; evil command')).toThrow(GitError);
    // check-ref-format may not even be called due to early rejection
    const diffCalls = mockExecFileSync.mock.calls.filter(
      ([, args]) => Array.isArray(args) && (args as string[]).includes('diff'),
    );
    expect(diffCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// makeCommit
// ---------------------------------------------------------------------------
describe('makeCommit', () => {
  it('calls execFileSync with git commit -m and the message as a separate arg', () => {
    mockExecFileSync.mockReturnValue(undefined as unknown as Buffer);
    makeCommit('feat: test commit');

    const [cmd, args] = mockExecFileSync.mock.calls[0];
    expect(cmd).toBe('git');
    expect(Array.isArray(args)).toBe(true);
    expect(args).toEqual(['commit', '-m', 'feat: test commit']);
  });

  it('passes a message with special characters as a single discrete arg', () => {
    mockExecFileSync.mockReturnValue(undefined as unknown as Buffer);
    const msg = 'fix: handle `null` values in parser; update docs';
    makeCommit(msg);
    const [, args] = mockExecFileSync.mock.calls[0];
    // The message must be the third element, unmodified
    expect((args as string[])[2]).toBe(msg);
  });

  it('never interpolates the message into a shell command string', () => {
    mockExecFileSync.mockReturnValue(undefined as unknown as Buffer);
    makeCommit('feat: normal commit');
    // Verify execFileSync was never called with a string as the command
    for (const [cmd] of mockExecFileSync.mock.calls) {
      expect(typeof cmd).toBe('string');
      // The command must be just 'git', not a longer interpolated string
      expect(cmd).toBe('git');
    }
  });
});
