import { describe, it, expect } from 'vitest';
import { generateCommitMessage, generatePRDescription } from '../src/utils/openai.js';

describe('openai utils', () => {
  it('should generate standard mock commit message if API key is not set', async () => {
    const config = { language: 'en', conventionalTypes: ['feat', 'fix'], securityPatterns: [] };
    const mockDiff = 'diff --git a/index.ts b/index.ts\n+console.log("hello");';
    const message = await generateCommitMessage(mockDiff, config, true); // true forces mock mode
    expect(message).toContain('feat');
    expect(message).toContain('hello');
  });

  it('should generate standard mock PR description if API key is not set', async () => {
    const config = { language: 'en', conventionalTypes: ['feat', 'fix'], securityPatterns: [] };
    const mockDiff = 'diff --git a/index.ts b/index.ts\n+console.log("hello");';
    const mockCommits = 'feat(core): auto-scaffold improvements';
    const prDescription = await generatePRDescription(mockDiff, mockCommits, config, true); // true forces mock mode
    expect(prDescription).toContain('Premium Pull Request Summary');
    expect(prDescription).toContain('Changes Proposed');
    expect(prDescription).toContain('feat(core): auto-scaffold improvements');
  });
});
