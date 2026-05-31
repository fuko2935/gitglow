import fs from 'fs';
import path from 'path';
import { GitGlowConfig } from '../types/index.js';

const DEFAULTS: GitGlowConfig = {
  language: 'en',
  conventionalTypes: ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore'],
  securityPatterns: [
    { name: 'AWS Access Key', regex: '(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}' },
    { name: 'OpenAI API Key', regex: 'sk-[a-zA-Z0-9-]{32,}' },
    { name: 'GitHub Token', regex: 'gh[psoir]_[a-zA-Z0-9]{36}' },
    { name: 'Private SSH Key', regex: '-----BEGIN [A-Z ]+ PRIVATE KEY-----' }
  ]
};

export function loadConfig(): GitGlowConfig {
  const localConfigPath = path.join(process.cwd(), '.gitglow.json');
  if (fs.existsSync(localConfigPath)) {
    try {
      const content = fs.readFileSync(localConfigPath, 'utf8');
      const parsed = JSON.parse(content);
      return { ...DEFAULTS, ...parsed };
    } catch {
      return DEFAULTS;
    }
  }
  return DEFAULTS;
}
