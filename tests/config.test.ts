import { describe, it, expect, vi } from 'vitest';
import { loadConfig } from '../src/utils/config.js';
import fs from 'fs';

vi.mock('fs');

describe('config utils', () => {
  it('should load default configuration when no file exists', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const config = loadConfig();
    expect(config.language).toBe('en');
    expect(config.conventionalTypes).toContain('feat');
  });

  it('should override defaults with file configuration', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ language: 'tr' }));
    const config = loadConfig();
    expect(config.language).toBe('tr');
  });
});
