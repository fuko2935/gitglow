/**
 * Config loader with parse-error reporting and unknown-key warnings.
 *
 * SECURITY: Do NOT store your OpenAI API key in .gitglow.json.
 * Use the OPENAI_API_KEY environment variable instead to avoid
 * accidentally committing credentials to your repository.
 */
import fs from 'fs';
import path from 'path';
import { GitGlowConfig } from '../types/index.js';

export const DEFAULTS: GitGlowConfig = {
  language: 'en',
  conventionalTypes: [
    'feat',
    'fix',
    'docs',
    'style',
    'refactor',
    'perf',
    'test',
    'build',
    'ci',
    'chore',
  ],
  securityPatterns: [
    {
      name: 'AWS Access Key',
      regex: '(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}',
      severity: 'critical',
    },
    {
      name: 'OpenAI API Key',
      regex: 'sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}',
      severity: 'critical',
    },
    {
      name: 'OpenAI API Key (new format)',
      regex: 'sk-proj-[a-zA-Z0-9_-]{50,}',
      severity: 'critical',
    },
    {
      name: 'GitHub Personal Access Token (classic)',
      regex: 'ghp_[a-zA-Z0-9]{36}',
      severity: 'critical',
    },
    {
      name: 'GitHub OAuth Token',
      regex: 'gho_[a-zA-Z0-9]{36}',
      severity: 'critical',
    },
    {
      name: 'GitHub App Installation Token',
      regex: 'ghs_[a-zA-Z0-9]{36}',
      severity: 'critical',
    },
    {
      name: 'GitHub Refresh Token',
      regex: 'ghr_[a-zA-Z0-9]{36}',
      severity: 'critical',
    },
    {
      name: 'GitHub Fine-Grained PAT',
      regex: 'github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}',
      severity: 'critical',
    },
    {
      name: 'Private Key Header',
      regex: '-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY( BLOCK)?-----',
      severity: 'critical',
    },
    {
      name: 'npm Access Token',
      regex: 'npm_[a-zA-Z0-9]{30,}',
      severity: 'critical',
    },
    {
      name: 'Slack Bot Token',
      regex: 'xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}',
      severity: 'critical',
    },
    {
      name: 'Slack User Token',
      regex: 'xoxp-[0-9]+-[0-9]+-[0-9]+-[a-f0-9]+',
      severity: 'critical',
    },
    {
      name: 'Stripe Secret Key',
      regex: 'sk_live_[a-zA-Z0-9]{24,}',
      severity: 'critical',
    },
    {
      name: 'Google Service Account JSON (partial)',
      regex: '"type"\\s*:\\s*"service_account"',
      severity: 'warning',
    },
    {
      name: 'Generic Password Assignment',
      regex: '(password|passwd|pwd|secret|api_key|apikey|access_token)\\s*[:=]\\s*["\'][^"\']{8,}["\']',
      severity: 'warning',
    },
    {
      name: 'JWT Token',
      regex: 'eyJ[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}',
      severity: 'warning',
    },
  ],
  maxDiffBytes: 20_000,
  model: 'gpt-4o-mini',
};

/** Keys that are valid in .gitglow.json */
const KNOWN_KEYS = new Set<string>([
  'language',
  'conventionalTypes',
  'securityPatterns',
  'maxDiffBytes',
  'model',
  // openaiApiKey is intentionally excluded from the known-keys set so it
  // triggers the warning below when found in a config file.
]);

export function loadConfig(configPath?: string): GitGlowConfig {
  const localConfigPath =
    configPath ?? path.join(process.cwd(), '.gitglow.json');

  if (!fs.existsSync(localConfigPath)) {
    return DEFAULTS;
  }

  let parsed: Record<string, unknown>;
  try {
    const content = fs.readFileSync(localConfigPath, 'utf8');
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      `[GitGlow] Warning: could not parse config file at "${localConfigPath}": ${reason}. ` +
        `Using default configuration.`,
    );
    return DEFAULTS;
  }

  // Warn about unknown or dangerous keys
  for (const key of Object.keys(parsed)) {
    if (key === 'openaiApiKey') {
      console.warn(
        `[GitGlow] Security warning: "openaiApiKey" found in "${localConfigPath}". ` +
          `Storing API keys in project config files risks accidental secret commits. ` +
          `Use the OPENAI_API_KEY environment variable instead.`,
      );
    } else if (!KNOWN_KEYS.has(key)) {
      console.warn(
        `[GitGlow] Warning: unknown config key "${key}" in "${localConfigPath}" will be ignored.`,
      );
    }
  }

  return { ...DEFAULTS, ...parsed };
}
