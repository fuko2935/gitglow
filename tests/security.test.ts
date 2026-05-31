/**
 * Tests for the security scanner.
 * Covers pattern detection, file/line metadata, false positives, redaction,
 * and JSON output mode.
 */
import { describe, it, expect } from 'vitest';
import { runSecurityScan, executeScan } from '../src/commands/security.js';
import { DEFAULTS } from '../src/utils/config.js';

// A minimal config with all default patterns
const defaultConfig = DEFAULTS;

// Helper: build a minimal unified diff with a single added line
function makeDiff(filePath: string, addedLine: string, startLine = 1): string {
  return (
    `diff --git a/${filePath} b/${filePath}\n` +
    `--- a/${filePath}\n` +
    `+++ b/${filePath}\n` +
    `@@ -1,1 +${startLine},2 @@\n` +
    ` existing line\n` +
    `+${addedLine}\n`
  );
}

describe('runSecurityScan – pattern detection', () => {
  it('detects an OpenAI API key (new format)', () => {
    const key = 'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnop';
    const violations = runSecurityScan(makeDiff('config.ts', `const key = "${key}";`), defaultConfig);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].patternName).toMatch(/OpenAI/i);
  });

  it('detects a generic OpenAI API key format', () => {
    const key = 'sk-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ';
    const violations = runSecurityScan(makeDiff('.env', `OPENAI_API_KEY=${key}`), defaultConfig);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].patternName).toMatch(/OpenAI/i);
  });

  it('detects an AWS access key', () => {
    const violations = runSecurityScan(
      makeDiff('aws.ts', 'const id = "AKIAIOSFODNN7EXAMPLE";'),
      defaultConfig,
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].patternName).toMatch(/AWS/i);
  });

  it('detects a GitHub classic PAT', () => {
    const violations = runSecurityScan(
      makeDiff('ci.ts', 'const token = "ghp_' + 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8";'),
      defaultConfig,
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].patternName).toMatch(/GitHub/i);
  });

  it('detects an npm access token', () => {
    const violations = runSecurityScan(
      makeDiff('.npmrc', '//registry.npmjs.org/:_authToken=npm_' + 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7'),
      defaultConfig,
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].patternName).toMatch(/npm/i);
  });

  it('detects a Slack bot token', () => {
    const violations = runSecurityScan(
      makeDiff('slack.ts', 'const bot = "xoxb-' + '12345678901-12345678901-abcdefghijklmnopqrstuvwx";'),
      defaultConfig,
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].patternName).toMatch(/Slack/i);
  });

  it('detects a private key header', () => {
    const violations = runSecurityScan(
      makeDiff('keys/secret.pem', '-----BEGIN RSA PRIVATE KEY-----'),
      defaultConfig,
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].patternName).toMatch(/Private Key/i);
  });

  it('passes safe code with no secrets', () => {
    const violations = runSecurityScan(
      makeDiff('app.ts', 'const x = 42;'),
      defaultConfig,
    );
    expect(violations.length).toBe(0);
  });
});

describe('runSecurityScan – file path and line number metadata', () => {
  it('reports the correct file path', () => {
    const violations = runSecurityScan(
      makeDiff('src/secrets.ts', 'const token = "npm_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7";'),
      defaultConfig,
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].filePath).toBe('src/secrets.ts');
  });

  it('reports the correct line number', () => {
    // startLine=5 means the added line is at new-file line 6 (existing=5, added=6)
    const diff =
      'diff --git a/env.ts b/env.ts\n' +
      '--- a/env.ts\n' +
      '+++ b/env.ts\n' +
      '@@ -1,5 +1,6 @@\n' +
      ' line1\n' +
      ' line2\n' +
      ' line3\n' +
      ' line4\n' +
      ' line5\n' +
      '+const key = "AKIAIOSFODNN7EXAMPLE";\n';

    const violations = runSecurityScan(diff, defaultConfig);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].lineNumber).toBe(6);
  });
});

describe('runSecurityScan – redaction', () => {
  it('does not expose the full secret in the violation output', () => {
    const full = 'AKIAIOSFODNN7EXAMPLE';
    const violations = runSecurityScan(
      makeDiff('cfg.ts', `const id = "${full}";`),
      defaultConfig,
    );
    expect(violations.length).toBeGreaterThan(0);
    // lineContent should not contain the full secret
    expect(violations[0].lineContent).not.toContain(full);
    // Should contain redacted marker
    expect(violations[0].lineContent).toContain('(redacted)');
  });
});

describe('runSecurityScan – context and deleted lines not flagged', () => {
  it('does not flag a secret on a deleted line', () => {
    const diff =
      'diff --git a/old.ts b/old.ts\n' +
      '--- a/old.ts\n' +
      '+++ b/old.ts\n' +
      '@@ -1,1 +1,1 @@\n' +
      '-const key = "AKIAIOSFODNN7EXAMPLE";\n' + // deleted line
      '+const key = process.env.AWS_KEY;\n'; // replaced with env var

    const violations = runSecurityScan(diff, defaultConfig);
    // The secret is on a deleted line – should not be flagged
    expect(violations.length).toBe(0);
  });
});

describe('executeScan – JSON output', () => {
  it('outputs valid JSON with violations array when --json is used', () => {
    const lines: string[] = [];
    const origLog = console.log.bind(console);
    // Capture console.log output
    console.log = (msg: string) => lines.push(msg);
    try {
      executeScan(makeDiff('cfg.ts', 'const id = "AKIAIOSFODNN7EXAMPLE";'), defaultConfig, true);
    } finally {
      console.log = origLog;
    }
    const parsed = JSON.parse(lines.join('')) as { violations: unknown[]; clean: boolean };
    expect(Array.isArray(parsed.violations)).toBe(true);
    expect(parsed.clean).toBe(false);
  });

  it('outputs clean:true JSON when no violations found', () => {
    const lines: string[] = [];
    const origLog = console.log.bind(console);
    console.log = (msg: string) => lines.push(msg);
    try {
      executeScan(makeDiff('app.ts', 'const x = 42;'), defaultConfig, true);
    } finally {
      console.log = origLog;
    }
    const parsed = JSON.parse(lines.join('')) as { violations: unknown[]; clean: boolean };
    expect(parsed.clean).toBe(true);
    expect(parsed.violations.length).toBe(0);
  });
});
