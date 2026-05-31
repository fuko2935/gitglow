/**
 * Tests for the commit message validator.
 */
import { describe, it, expect } from 'vitest';
import { validateCommitMessage, validatePRDescription } from '../src/utils/validate.js';

describe('validateCommitMessage', () => {
  // -------------------------------------------------------------------------
  // Valid messages
  // -------------------------------------------------------------------------
  it('accepts a valid Conventional Commit message', () => {
    const result = validateCommitMessage('feat(auth): add OAuth2 login support');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('feat(auth): add OAuth2 login support');
  });

  it('accepts a message without scope', () => {
    const result = validateCommitMessage('fix: resolve null pointer in parser');
    expect(result.valid).toBe(true);
  });

  it('accepts a breaking-change indicator', () => {
    const result = validateCommitMessage('feat(api)!: remove deprecated endpoints');
    expect(result.valid).toBe(true);
  });

  it('accepts a message with a body', () => {
    const msg = 'chore: update dependencies\n\n- bumped lodash to 4.17.21\n- bumped chalk to 5.x';
    const result = validateCommitMessage(msg);
    expect(result.valid).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Invalid messages
  // -------------------------------------------------------------------------
  it('rejects an empty message', () => {
    const result = validateCommitMessage('');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });

  it('rejects a message without a type prefix', () => {
    const result = validateCommitMessage('added new login screen');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Conventional Commits/i);
  });

  it('rejects a message with an uppercase type', () => {
    const result = validateCommitMessage('Feat: something');
    expect(result.valid).toBe(false);
  });

  it('rejects a subject line longer than 72 characters', () => {
    const long = 'feat: ' + 'x'.repeat(68); // 6 + 68 = 74 chars
    const result = validateCommitMessage(long);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too long/i);
  });

  it('rejects a disallowed type when allowedTypes is provided', () => {
    const result = validateCommitMessage('spike: explore new DB', ['feat', 'fix', 'chore']);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/"spike"/);
  });

  it('accepts a type when allowedTypes is empty (no restriction)', () => {
    const result = validateCommitMessage('spike: explore something', []);
    expect(result.valid).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Markdown fence stripping
  // -------------------------------------------------------------------------
  it('strips markdown code fences from AI output', () => {
    const raw = '```\nfeat(ui): improve button styling\n```';
    const result = validateCommitMessage(raw);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('feat(ui): improve button styling');
  });

  it('strips language-tagged code fences', () => {
    const raw = '```text\nfix: correct off-by-one error\n```';
    const result = validateCommitMessage(raw);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('fix: correct off-by-one error');
  });
});

describe('validatePRDescription', () => {
  it('accepts a PR description containing all required sections', () => {
    const markdown = `
# Awesome PR
## Summary
This PR does things.

## Changes proposed
- Changed file X
- Updated Y

## Verification Status
- Verified locally.
    `;
    const result = validatePRDescription(markdown);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects a PR description missing summary, changes, or verification', () => {
    const markdown = `
# Bad PR
Just some plain text without proper sections.
    `;
    const result = validatePRDescription(markdown);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(3);
    expect(result.errors[0]).toContain('Summary');
    expect(result.errors[1]).toContain('Changes');
    expect(result.errors[2]).toContain('Verification');
  });
});
