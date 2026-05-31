/**
 * Tests for the config loader.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../src/utils/config.js';
import fs from 'fs';

vi.mock('fs');

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('loadConfig – defaults', () => {
  it('returns defaults when no config file exists', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const config = loadConfig();
    expect(config.language).toBe('en');
    expect(config.conventionalTypes).toContain('feat');
    expect(config.securityPatterns.length).toBeGreaterThan(4);
  });
});

describe('loadConfig – file override', () => {
  it('merges file config over defaults', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ language: 'tr' }));
    const config = loadConfig();
    expect(config.language).toBe('tr');
    // Defaults for other fields preserved
    expect(config.conventionalTypes).toContain('fix');
  });

  it('uses custom maxDiffBytes from file', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ maxDiffBytes: 5000 }));
    const config = loadConfig();
    expect(config.maxDiffBytes).toBe(5000);
  });
});

describe('loadConfig – error handling', () => {
  it('warns and returns defaults when JSON is invalid', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{ not valid json }');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = loadConfig();

    expect(config.language).toBe('en'); // defaults returned
    expect(warnSpy).toHaveBeenCalledOnce();
    const warnMsg = warnSpy.mock.calls[0][0] as string;
    expect(warnMsg).toMatch(/could not parse/i);
  });

  it('includes the file path in the parse-error warning', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('bad json');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    loadConfig('/some/path/.gitglow.json');

    const msg = warnSpy.mock.calls[0][0] as string;
    expect(msg).toContain('/some/path/.gitglow.json');
  });

  it('warns about unknown config keys', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({ language: 'en', unknownField: true }),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = loadConfig();

    const msgs = warnSpy.mock.calls.map(c => c[0] as string);
    expect(msgs.some(m => m.includes('unknownField'))).toBe(true);
    expect('unknownField' in config).toBe(false);
  });

  it('warns when openaiApiKey is found in the config file', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({ language: 'en', openaiApiKey: 'sk-test' }),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = loadConfig();

    const msgs = warnSpy.mock.calls.map(c => c[0] as string);
    expect(msgs.some(m => m.includes('openaiApiKey'))).toBe(true);
    expect(msgs.some(m => m.match(/security warning/i))).toBe(true);
    expect('openaiApiKey' in config).toBe(false);
  });
});
