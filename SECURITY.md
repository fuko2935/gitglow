# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅ Yes    |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in GitGlow, please report it by opening a **GitHub Security Advisory** at:

> https://github.com/fuko2935/gitglow/security/advisories/new

Include as much detail as possible:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

You will receive a response within **72 hours**. If the issue is confirmed, we will publish a fix and credit you (unless you prefer to remain anonymous).

## Security Design Notes

### Shell Safety
All git commands in GitGlow use `execFileSync` with explicit argument arrays. No user-provided strings are interpolated into shell command strings. Branch names are validated via `git check-ref-format` before use.

### Secret Scanning
GitGlow's scanner covers the patterns listed in `src/utils/config.ts`. It is designed as a pre-commit convenience tool, **not** a comprehensive secrets management solution. It does not replace tools like [truffleHog](https://github.com/trufflesecurity/trufflehog), [gitleaks](https://github.com/gitleaks/gitleaks), or [detect-secrets](https://github.com/Yelp/detect-secrets).

### AI & Privacy
When AI mode is active, your staged diff or branch diff is sent to the OpenAI API. Use `--no-ai` / `--force-mock` to keep all data local. Never commit your `OPENAI_API_KEY` to your repository; use environment variables.
