/**
 * Tests for OpenAI integration utilities.
 * All tests run without a real API key.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCommitMessage, generatePRDescription } from '../src/utils/openai.js';

const mockConfig = {
  language: 'en',
  conventionalTypes: ['feat', 'fix', 'chore'],
  securityPatterns: [],
  maxDiffBytes: 20_000,
  model: 'gpt-4o-mini',
};

const mockDiff = 'diff --git a/index.ts b/index.ts\n+console.log("hello");';
const mockCommits = 'abc123 feat(core): add hello world';

describe('generateCommitMessage – mock mode', () => {
  it('returns a mock message when forceMock is true', async () => {
    const msg = await generateCommitMessage(mockDiff, mockConfig, true);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('contains [Mock mode] label in mock output', async () => {
    const msg = await generateCommitMessage(mockDiff, mockConfig, true);
    expect(msg).toMatch(/mock mode/i);
  });

  it('uses feat type when it is in conventionalTypes', async () => {
    const msg = await generateCommitMessage(mockDiff, mockConfig, true);
    expect(msg).toMatch(/^feat/);
  });

  it('does NOT claim tests passed in mock output', async () => {
    const msg = await generateCommitMessage(mockDiff, mockConfig, true);
    expect(msg.toLowerCase()).not.toMatch(/test.*pass/);
    expect(msg.toLowerCase()).not.toMatch(/tests executed/);
  });
});

describe('generatePRDescription – mock mode', () => {
  it('returns a mock PR description when forceMock is true', async () => {
    const pr = await generatePRDescription(mockDiff, mockCommits, mockConfig, true);
    expect(typeof pr).toBe('string');
    expect(pr.length).toBeGreaterThan(0);
  });

  it('does NOT claim "Unit tests executed successfully" in mock', async () => {
    const pr = await generatePRDescription(mockDiff, mockCommits, mockConfig, true);
    expect(pr.toLowerCase()).not.toContain('unit tests executed successfully');
    expect(pr.toLowerCase()).not.toMatch(/tests.*pass/);
  });

  it('includes an honest disclaimer in mock mode', async () => {
    const pr = await generatePRDescription(mockDiff, mockCommits, mockConfig, true);
    // Should mention that tests are NOT verified
    expect(pr.toLowerCase()).toMatch(/not verified|mock mode|confirm.*ci/i);
  });

  it('includes the commits in the mock PR', async () => {
    const pr = await generatePRDescription(mockDiff, mockCommits, mockConfig, true);
    expect(pr).toContain('abc123');
  });
});

describe('generateCommitMessage – API error handling', () => {
  beforeEach(() => {
    // Set a fake API key so the code enters real-API mode
    process.env.OPENAI_API_KEY = 'sk-fake-key-for-testing';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  it('throws an error (not silently falls back) on non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid API key' } }),
    } as Response);

    await expect(generateCommitMessage(mockDiff, mockConfig, false)).rejects.toThrow(/401/);
  });

  it('throws a timeout error when request takes too long', async () => {
    global.fetch = vi.fn().mockImplementation((_url: unknown, init: { signal?: AbortSignal }) => {
      return new Promise((_, reject) => {
        // Listen for abort signal and reject with AbortError
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const e = new Error('The operation was aborted');
            e.name = 'AbortError';
            reject(e);
          });
        }
        // Also reject after a short while to ensure the test doesn't hang
        setTimeout(() => {
          const e = new Error('The operation was aborted');
          e.name = 'AbortError';
          reject(e);
        }, 10);
      });
    });

    await expect(generateCommitMessage(mockDiff, mockConfig, false)).rejects.toThrow(/timed out/i);
  });

  it('throws on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));

    await expect(generateCommitMessage(mockDiff, mockConfig, false)).rejects.toThrow(/network error|fetch failed/i);
  });

  it('throws when choices array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'x', object: 'chat.completion', choices: [] }),
    } as unknown as Response);

    await expect(generateCommitMessage(mockDiff, mockConfig, false)).rejects.toThrow(/empty response/i);
  });
});
