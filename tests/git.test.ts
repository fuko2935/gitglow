import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import { hasStagedFiles, getStagedDiff, getBranchDiff, makeCommit } from '../src/utils/git.js';

vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('git utils', () => {
  beforeEach(() => {
    vi.mocked(execSync).mockReset();
  });

  it('should return true if there are staged changes', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('M  src/index.ts'));
    expect(hasStagedFiles()).toBe(true);
  });

  it('should return false if there are no staged changes', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from(''));
    expect(hasStagedFiles()).toBe(false);
  });

  it('should return staged diff', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from('diff content'));
    expect(getStagedDiff()).toBe('diff content');
  });

  it('should return branch diff and commits', () => {
    vi.mocked(execSync)
      .mockReturnValueOnce(Buffer.from('branch diff content'))
      .mockReturnValueOnce(Buffer.from('commit history'));
    const result = getBranchDiff('main');
    expect(result.diff).toBe('branch diff content');
    expect(result.commits).toBe('commit history');
  });

  it('should execute git commit command', () => {
    makeCommit('feat: test commit');
    expect(execSync).toHaveBeenCalledWith('git commit -m "feat: test commit"', { stdio: 'inherit' });
  });
});

