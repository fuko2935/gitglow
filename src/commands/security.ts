/**
 * Security scanner.
 *
 * Scans the added lines (+) of a git diff for known secret patterns.
 * Patterns are precompiled once for performance.
 * File paths and 1-indexed line numbers are extracted from diff hunk headers.
 *
 * The scanner deliberately avoids the phrase "scan passed" to prevent
 * false confidence. "No configured patterns detected" is the correct message.
 */
import { GitGlowConfig, SecurityViolation } from '../types/index.js';
import chalk from 'chalk';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface CompiledPattern {
  name: string;
  regex: RegExp;
  severity: 'critical' | 'warning';
}

interface DiffLine {
  filePath: string;
  lineNumber: number;
  content: string;
}

// ---------------------------------------------------------------------------
// Diff parser
// ---------------------------------------------------------------------------

/**
 * Parse the added lines from a unified diff, capturing file path and
 * 1-indexed line number from hunk headers.
 */
function parseAddedLines(diff: string): DiffLine[] {
  const lines = diff.split('\n');
  const results: DiffLine[] = [];

  let currentFile = '(unknown)';
  let newLineCounter = 0;

  for (const line of lines) {
    // +++ b/path/to/file  →  extract file path
    if (line.startsWith('+++ ')) {
      currentFile = line.slice(4).replace(/^b\//, '');
      continue;
    }

    // @@ -a,b +c,d @@  →  reset the new-file line counter
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLineCounter = parseInt(hunkMatch[1], 10) - 1; // will be incremented before use
      continue;
    }

    // Lines starting with + (but not +++) are added lines
    if (line.startsWith('+') && !line.startsWith('+++')) {
      newLineCounter++;
      results.push({
        filePath: currentFile,
        lineNumber: newLineCounter,
        content: line.slice(1), // strip the leading +
      });
      continue;
    }

    // Context lines (no prefix or space prefix) still advance the new-file counter
    if (!line.startsWith('-') && !line.startsWith('\\')) {
      newLineCounter++;
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Pattern compilation
// ---------------------------------------------------------------------------

/** Compile config patterns once, filtering out invalid regex strings */
function compilePatterns(config: GitGlowConfig): CompiledPattern[] {
  const compiled: CompiledPattern[] = [];
  for (const p of config.securityPatterns) {
    try {
      compiled.push({
        name: p.name,
        regex: new RegExp(p.regex, 'i'), // case-insensitive for generic patterns
        severity: p.severity ?? 'warning',
      });
    } catch {
      console.warn(`[GitGlow] Warning: invalid regex in security pattern "${p.name}" – skipping.`);
    }
  }
  return compiled;
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

/**
 * Safely redact a secret value for terminal display.
 * Shows only the first 4 characters followed by *** to minimise leakage
 * while still being useful for identification.
 */
function redact(value: string): string {
  if (value.length <= 4) return '****';
  return value.slice(0, 4) + '*'.repeat(Math.min(8, value.length - 4));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan the diff for secret patterns.
 * Returns an array of violations with file path, line number, and redacted content.
 */
export function runSecurityScan(diff: string, config: GitGlowConfig): SecurityViolation[] {
  const patterns = compilePatterns(config);
  const addedLines = parseAddedLines(diff);
  const violations: SecurityViolation[] = [];

  for (const { filePath, lineNumber, content } of addedLines) {
    for (const pattern of patterns) {
      const match = content.match(pattern.regex);
      if (match) {
        violations.push({
          patternName: pattern.name,
          severity: pattern.severity,
          lineContent: redact(match[0]) + '  (redacted)',
          filePath,
          lineNumber,
        });
      }
    }
  }

  return violations;
}

/**
 * Execute the security scan and print human-readable output.
 * Returns true if the scan is clean, false if violations were found.
 *
 * @param jsonOutput - When true, prints violations as JSON (useful for CI pipelines)
 */
export function executeScan(
  diff: string,
  config: GitGlowConfig,
  jsonOutput = false,
): boolean {
  const violations = runSecurityScan(diff, config);

  if (jsonOutput) {
    console.log(JSON.stringify({ violations, clean: violations.length === 0 }, null, 2));
    return violations.length === 0;
  }

  if (violations.length > 0) {
    console.error(chalk.red.bold('\n[GitGlow Scanner] Secret pattern detected in staged changes!'));
    console.error(chalk.red('Commit blocked. Remove secrets before committing.\n'));

    for (const v of violations) {
      const severityTag =
        v.severity === 'critical'
          ? chalk.bgRed.white(' CRITICAL ')
          : chalk.bgYellow.black(' WARNING  ');
      console.error(
        `  ${severityTag} ${chalk.yellow(v.patternName)} ` +
          `at ${chalk.cyan(v.filePath)}:${chalk.cyan(String(v.lineNumber))}`,
      );
      console.error(`  ${chalk.dim('Matched: ')}${chalk.red(v.lineContent)}`);
    }

    console.error(
      chalk.cyan(
        '\nℹ  Tip: Use `git diff --cached` to inspect staged changes, ' +
          'then remove or rotate any secrets before retrying.\n',
      ),
    );
    return false;
  }

  console.log(
    chalk.green('✓ No configured secret patterns detected in staged changes.'),
  );
  console.log(
    chalk.dim(
      '  Note: This scanner checks only configured patterns. ' +
        'It does not guarantee absence of all secrets.',
    ),
  );
  return true;
}
