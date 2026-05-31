export interface GitGlowConfig {
  openaiApiKey?: string;
  language: string;
  conventionalTypes: string[];
  securityPatterns: { name: string; regex: string }[];
}
