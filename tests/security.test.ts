import { describe, it, expect } from 'vitest';
import { runSecurityScan } from '../src/commands/security.js';

describe('security scanner', () => {
  const config = {
    language: 'en',
    conventionalTypes: [],
    securityPatterns: [
      { name: 'OpenAI API Key', regex: 'sk-[a-zA-Z0-9-]{32,}' }
    ]
  };

  it('should flag high-risk strings in the code', () => {
    const diff = 'diff --git a/app.ts\n+const key = "sk-abcd1234abcd1234abcd1234abcd1234abcd1234";';
    const violations = runSecurityScan(diff, config);
    expect(violations.length).toBe(1);
    expect(violations[0].patternName).toBe('OpenAI API Key');
  });

  it('should pass safe code diffs', () => {
    const diff = 'diff --git a/app.ts\n+const code = 42;';
    const violations = runSecurityScan(diff, config);
    expect(violations.length).toBe(0);
  });
});
