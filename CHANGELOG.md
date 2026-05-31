# Changelog

All notable changes to GitGlow will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
GitGlow uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] – 2024-01-01

### Added
- `gitglow commit` – AI-assisted Conventional Commit message generation with interactive prompt (commit / edit / regenerate / abort).
- `gitglow scan` – Staged-diff secret scanner with 16+ regex patterns covering AWS, GitHub, OpenAI, npm, Slack, Stripe, JWT, private keys, and more. Supports `--json` output for CI pipelines.
- `gitglow pr <baseBranch>` – AI-assisted Pull Request description generator. Supports `--no-clipboard`, `--output <file>`, and `--dry-run`.
- `--no-ai` flag on `commit` and `pr` commands for fully offline mock mode.
- `--yes` flag on `commit` for non-interactive CI usage.
- `--dry-run` flag on `commit` and `pr` to preview output without side effects.
- Commit message validation enforcing Conventional Commits format, subject length limit (72 chars), and type allowlist.
- Privacy notice displayed before diff is sent to OpenAI API.
- Diff truncation at `maxDiffBytes` (configurable, default 20 000 bytes) before AI transmission.
- Shell-injection protection: all git commands use `execFileSync` with argument arrays.
- Branch ref validation via `git check-ref-format` before diff operations.
- Typed `GitError` class with actionable error messages.
- Config parse-error and unknown-key warnings.
- Security warning when `openaiApiKey` is detected in `.gitglow.json`.
- OSS governance: `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.

### Changed
- Mock PR description no longer contains fabricated test results.
- Security scan success message changed to "No configured secret patterns detected" to avoid false confidence.
- `openaiApiKey` removed from `.gitglow.json` config example; env var recommended.

### Fixed
- Shell injection vulnerability in `getBranchDiff` (was using template-string interpolation).
- `makeCommit` now passes the commit message as a discrete argument to `execFileSync`.
- OpenAI errors now surface HTTP status and detail; no longer silently swallow failures.

---

*Older entries will be added here as the project evolves.*
