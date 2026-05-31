# Contributing to GitGlow

Thank you for your interest in contributing! This guide covers the development workflow.

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **git**

## Setup

```bash
git clone https://github.com/fukobabatekkral/gitglow.git
cd gitglow
npm install
npm run build
```

## Development Workflow

```bash
# Build TypeScript
npm run build

# Type check only (no output)
npm run typecheck

# Run tests (all)
npm test

# Run tests in watch mode
npm run test:watch

# Lint source
npm run lint

# Lint and auto-fix
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## Project Structure

```
src/
  cli.ts              # Command registration (Commander)
  index.ts            # Entry point (shebang)
  commands/
    commit.ts         # gitglow commit action
    pr.ts             # gitglow pr action
    security.ts       # Security scanner + executeScan
  utils/
    config.ts         # Config loader (.gitglow.json)
    git.ts            # Safe git utilities (execFileSync only)
    openai.ts         # OpenAI integration
    validate.ts       # Commit message validator
  types/
    index.ts          # All domain types and interfaces
tests/                # Vitest unit tests
```

## Key Design Principles

1. **No shell injection**: Always use `execFileSync(cmd, args[])`, never `execSync(shellString)`.
2. **No silent failures**: Git errors must throw `GitError`, not return empty/false.
3. **No fabricated facts**: Mock outputs must never claim tests passed or make up data.
4. **Privacy by default**: Always display a notice when diffs are sent to external APIs.
5. **Typed everything**: No `any` types – add proper interfaces when needed.

## Submitting a Pull Request

1. Fork and create a branch: `git checkout -b feat/my-change`
2. Make your changes following the principles above
3. Add tests for new behaviour
4. Run the full CI suite: `npm run typecheck && npm run lint && npm test`
5. Open a PR against `main`

## Reporting Bugs

Please use [GitHub Issues](https://github.com/fukobabatekkral/gitglow/issues).  
For **security vulnerabilities**, see [SECURITY.md](./SECURITY.md).
