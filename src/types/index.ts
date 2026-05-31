/**
 * GitGlow domain types.
 * All exported types used across the CLI, utils, and commands.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SecurityPattern {
  /** Human-readable name shown in violation reports */
  name: string;
  /** Raw regex string (will be compiled with 'g' flag) */
  regex: string;
  /** Severity level for this pattern */
  severity?: 'critical' | 'warning';
}

export interface GitGlowConfig {
  /** OpenAI API key – prefer OPENAI_API_KEY env var instead */
  openaiApiKey?: string;
  /** Language for AI-generated text (e.g. 'en', 'tr') */
  language: string;
  /** Allowed Conventional Commit types */
  conventionalTypes: string[];
  /** Secret patterns to scan for in staged diffs */
  securityPatterns: SecurityPattern[];
  /** Max bytes of diff to send to the AI provider (default: 20000) */
  maxDiffBytes?: number;
  /** OpenAI model to use (default: gpt-4o-mini) */
  model?: string;
}

// ---------------------------------------------------------------------------
// Git domain models
// ---------------------------------------------------------------------------

/** Typed error for git command failures */
export class GitError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GitError';
  }
}

export interface BranchDiffResult {
  diff: string;
  commits: string;
}

export interface StagedDiffResult {
  diff: string;
  /** Estimated byte size of the diff */
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// Security scanner
// ---------------------------------------------------------------------------

export interface SecurityViolation {
  patternName: string;
  severity: 'critical' | 'warning';
  /** Redacted snippet of the violating content */
  lineContent: string;
  /** Git diff file path where the violation was found */
  filePath: string;
  /** 1-indexed line number within the file (from diff hunk header) */
  lineNumber: number;
}

// ---------------------------------------------------------------------------
// AI / OpenAI
// ---------------------------------------------------------------------------

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChoice {
  message: OpenAIMessage;
  finish_reason: string;
  index: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  choices: OpenAIChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Commit validation
// ---------------------------------------------------------------------------

export interface CommitValidationResult {
  valid: boolean;
  /** The cleaned message (fences stripped, trimmed) */
  message: string;
  /** Human-readable error describing why validation failed */
  error?: string;
}
