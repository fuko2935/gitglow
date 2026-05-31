/**
 * Commit message and PR description validation.
 *
 * Enforces the Conventional Commits specification:
 *   type(optional-scope): short description
 *
 * Reference: https://www.conventionalcommits.org/en/v1.0.0/
 */
import { CommitValidationResult, PRValidationResult } from '../types/index.js';

/** Maximum length of the subject line (type + scope + description) */
const MAX_SUBJECT_LENGTH = 72;

/**
 * Regex for a valid Conventional Commit subject line.
 * Captures: type, optional scope, breaking indicator, description.
 */
const CONVENTIONAL_COMMIT_RE =
  /^([a-z]+)(\([a-z0-9._/-]+\))?(!)?: .+/;

/**
 * Strips common markdown code-fence wrappers that an LLM may produce.
 * e.g.  ```\nfeat: msg\n```  →  feat: msg
 */
function stripMarkdownFences(raw: string): string {
  // Remove opening fence (``` or ``` with language specifier)
  let cleaned = raw.replace(/^```[a-z]*\n?/i, '');
  // Remove closing fence
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}

/**
 * Validate and clean an AI-generated commit message.
 *
 * @param raw  - Raw text from the AI provider
 * @param allowedTypes - Allowed Conventional Commit types (e.g. ['feat','fix'])
 * @returns    CommitValidationResult with `valid`, cleaned `message`, and optional `error`
 */
export function validateCommitMessage(
  raw: string,
  allowedTypes: string[] = [],
): CommitValidationResult {
  const message = stripMarkdownFences(raw);

  if (!message) {
    return { valid: false, message, error: 'Commit message is empty.' };
  }

  const subjectLine = message.split('\n')[0];

  // Must match Conventional Commit format
  if (!CONVENTIONAL_COMMIT_RE.test(subjectLine)) {
    return {
      valid: false,
      message,
      error:
        `Subject line does not follow Conventional Commits format. ` +
        `Expected: "type(scope): description" — got: "${subjectLine}"`,
    };
  }

  // Subject line length
  if (subjectLine.length > MAX_SUBJECT_LENGTH) {
    return {
      valid: false,
      message,
      error:
        `Subject line is too long (${subjectLine.length} chars). ` +
        `Maximum is ${MAX_SUBJECT_LENGTH} characters.`,
    };
  }

  // Type allowlist check (only when allowedTypes is non-empty)
  if (allowedTypes.length > 0) {
    const match = subjectLine.match(/^([a-z]+)/);
    const type = match ? match[1] : '';
    if (!allowedTypes.includes(type)) {
      return {
        valid: false,
        message,
        error:
          `Commit type "${type}" is not in the allowed list: ${allowedTypes.join(', ')}.`,
      };
    }
  }

  return { valid: true, message };
}

/**
 * Validates that an AI-generated Pull Request description contains the required Markdown sections.
 * Expected sections:
 *  - Summary (e.g. ## Summary, ## Pull Request Summary)
 *  - Changes (e.g. ## Changes, ## 🛠️ Changes Proposed)
 *  - Verification (e.g. ## Verification, ## 🔍 Verification Status)
 */
export function validatePRDescription(markdown: string): PRValidationResult {
  const errors: string[] = [];
  const lowercase = markdown.toLowerCase();

  const hasSummary = lowercase.includes('## summary') || lowercase.includes('pull request summary');
  const hasChanges = lowercase.includes('## changes') || lowercase.includes('changes proposed');
  const hasVerification = lowercase.includes('## verification') || lowercase.includes('verification status');

  if (!hasSummary) {
    errors.push('PR description is missing the "Summary" section (## Summary).');
  }
  if (!hasChanges) {
    errors.push('PR description is missing the "Changes" section (## Changes).');
  }
  if (!hasVerification) {
    errors.push('PR description is missing the "Verification" section (## Verification).');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
