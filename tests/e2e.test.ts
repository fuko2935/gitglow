import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { executeScan, runSecurityScan } from '../src/commands/security.js';
import { loadConfig } from '../src/utils/config.js';
import { hasStagedFiles, getStagedDiff } from '../src/utils/git.js';

describe('Real Git E2E Tests', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    // Create a real temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitglow-e2e-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    // Cleanup
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('correctly reports hasStagedFiles is false when git is not initialized', () => {
    // Should fail and throw a GitError since it's not a git repository
    expect(() => hasStagedFiles()).toThrow(/Not a git repository/i);
  });

  it('initializes a git repo and detects staged changes correctly', () => {
    // 1. Init git repo
    execFileSync('git', ['init'], { stdio: 'ignore' });
    // Configure mock git user so commits can be done
    execFileSync('git', ['config', 'user.name', 'E2ETester'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'tester@e2e.local'], { stdio: 'ignore' });

    // 2. Check hasStagedFiles when empty
    expect(hasStagedFiles()).toBe(false);

    // 3. Write a safe file and stage it
    fs.writeFileSync(path.join(tempDir, 'app.js'), 'console.log("safe code");\n', 'utf8');
    expect(hasStagedFiles()).toBe(false); // not staged yet

    execFileSync('git', ['add', 'app.js'], { stdio: 'ignore' });
    expect(hasStagedFiles()).toBe(true); // staged!

    // 4. Run the security scan on the staged safe file
    const config = loadConfig();
    const { diff } = getStagedDiff();
    const clean = executeScan(diff, config, true); // json mode for clean capture
    expect(clean).toBe(true);
  });

  it('flags staged files containing hardcoded credentials', () => {
    // 1. Init git repo
    execFileSync('git', ['init'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'E2ETester'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'tester@e2e.local'], { stdio: 'ignore' });

    // 2. Write a file with an AWS secret and stage it
    const fileContent = `
      const config = {
        awsKey: "AKIAIOSFODNN7EXAMPLE",
        someVal: 42
      };
    `;
    fs.writeFileSync(path.join(tempDir, 'aws.js'), fileContent, 'utf8');
    execFileSync('git', ['add', 'aws.js'], { stdio: 'ignore' });

    // 3. Verify it is detected as a violation
    const config = loadConfig();
    const { diff } = getStagedDiff();
    const violations = runSecurityScan(diff, config);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].patternName).toBe('AWS Access Key');
    expect(violations[0].filePath).toBe('aws.js');
    expect(violations[0].lineNumber).toBe(3);
  });

  it('respects inline gitglow:ignore comments in a real git staged file', () => {
    // 1. Init git repo
    execFileSync('git', ['init'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'E2ETester'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'tester@e2e.local'], { stdio: 'ignore' });

    // 2. Write a file with a credential but with gitglow:ignore comment
    const fileContent = `
      const openaiKey = "sk-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ"; // gitglow:ignore
    `;
    fs.writeFileSync(path.join(tempDir, 'ignored_secret.js'), fileContent, 'utf8');
    execFileSync('git', ['add', 'ignored_secret.js'], { stdio: 'ignore' });

    // 3. Verify it is skipped
    const config = loadConfig();
    const { diff } = getStagedDiff();
    const violations = runSecurityScan(diff, config);
    expect(violations.length).toBe(0); // completely skipped due to ignore comment!
  });

  it('respects custom allowlist in the config file', () => {
    // 1. Init git repo
    execFileSync('git', ['init'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'E2ETester'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'tester@e2e.local'], { stdio: 'ignore' });

    // 2. Write a mock secret
    const secret = "ghp_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8";
    fs.writeFileSync(path.join(tempDir, 'token.js'), `const token = "${secret}";`, 'utf8');
    execFileSync('git', ['add', 'token.js'], { stdio: 'ignore' });

    // 3. Create a config with this token in the allowlist
    const configData = {
      allowlist: [secret]
    };
    fs.writeFileSync(path.join(tempDir, '.gitglow.json'), JSON.stringify(configData), 'utf8');

    // 4. Load config and scan
    const config = loadConfig(path.join(tempDir, '.gitglow.json'));
    const { diff } = getStagedDiff();
    const violations = runSecurityScan(diff, config);
    expect(violations.length).toBe(0); // skipped because the secret is allowlisted!
  });

  it('flags unpatterned high-entropy secrets', () => {
    // 1. Init git repo
    execFileSync('git', ['init'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'E2ETester'], { stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'tester@e2e.local'], { stdio: 'ignore' });

    // 2. Write a highly random base64 string that does not match specific rules
    const randomSecret = "K3s9F2d8J1a0L5h6G4f3D2s1A0q9W8e7R6t5Y4u3I2o1P0"; // highly random mix
    fs.writeFileSync(path.join(tempDir, 'random.js'), `const key = "${randomSecret}";`, 'utf8');
    execFileSync('git', ['add', 'random.js'], { stdio: 'ignore' });

    // 3. Scan and check for high-entropy warning
    const config = loadConfig();
    const { diff } = getStagedDiff();
    const violations = runSecurityScan(diff, config);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some(v => v.patternName === 'High-Entropy Secret Candidate')).toBe(true);
  });
});
