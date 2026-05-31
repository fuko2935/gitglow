<div align="center">

# ✨ GitGlow ✨
### *A Lightweight AI-Powered CLI for Git Commits & PR Descriptions*

[![GitHub workflow](https://img.shields.io/badge/CI-passing-2ea44f?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com)
[![Node version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Apache%202.0-orange?style=for-the-badge)](https://opensource.org/licenses/Apache-2.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-purple?style=for-the-badge)](https://github.com)

<p align="center">
  <b>GitGlow</b> is a lightweight, focused terminal companion designed to streamline your daily Git workflows. It uses intelligent local analysis and OpenAI's GPT models to automatically draft standardized semantic commit messages, synthesize structured markdown Pull Request descriptions, and perform zero-dependency credential audits to help guard your repositories from accidentally staged security keys.
</p>

---

[⚡ Features](#-features) • [🧩 Architecture](#-architecture) • [🚀 Quick Start](#-quick-start) • [📖 Command Guide](#-command-guide) • [⚙️ Configuration](#️-configuration) • [🧪 Testing](#-testing)

</div>

---

## ⚡ Features

*   🤖 **Smart Commits (`gitglow commit`)** — Analyzes staged changes and drafts clean, context-aware commit messages following the **Conventional Commits** specification.
*   🛡️ **Credential Auditor (`gitglow scan`)** — A focused, regex-based static scanning engine that inspects staged changes before commit to prevent accidental leakage of AWS keys, OpenAI keys, GitHub PATs, and Private SSH keys. Ignores lockfiles and binary media automatically to avoid false positives.
*   📝 **PR Synthesizer (`gitglow pr <baseBranch>`)** — Compares the current branch's commits and code delta against a target branch and designs a clear Markdown template for your Pull Request.
*   ⚡ **Zero-Dependency Mock Fallback** — Can run offline or keyless using `--force-mock` or automatic keyless fallbacks, creating a seamless environment for local runs and CI.
*   🎨 **Interactive & Fluid Interface** — Powered by elegant CLI prompt menus, real-time spinners, and high-contrast color formatting.

---

## 🧩 Architecture

GitGlow is designed with a decoupled router pattern that links CLI inputs, system processes, and API services:

```mermaid
graph TD
    CLI[src/cli.ts Router] -->|Route 'commit'| CmdCommit[src/commands/commit.ts]
    CLI -->|Route 'pr'| CmdPR[src/commands/pr.ts]
    CLI -->|Route 'scan'| CmdScan[src/commands/security.ts]
    
    CmdCommit -->|Read staged diff| GitUtil[src/utils/git.ts]
    CmdCommit -->|Load local config| ConfigUtil[src/utils/config.ts]
    CmdCommit -->|Generate semantic text| AIUtil[src/utils/openai.ts]
    
    CmdPR -->|Obtain branch delta| GitUtil
    CmdPR -->|Synthesize PR markdown| AIUtil
    
    CmdScan -->|Audit changed lines| SecUtil[Security Engine]
    
    style CLI fill:#6366f1,stroke:#312e81,stroke-width:2px,color:#fff
    style AIUtil fill:#10b981,stroke:#064e3b,stroke-width:2px,color:#fff
    style SecUtil fill:#ef4444,stroke:#7f1d1d,stroke-width:2px,color:#fff
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher.
- **Git**: Properly configured in your local path.

### 2. Installation & Usage

#### Option A: Run instantly via `npx` (No setup required!)
```bash
npx @fukobabatekkral/gitglow commit
```

#### Option B: Install globally
```bash
npm install -g @fukobabatekkral/gitglow
@fukobabatekkral/gitglow --help
```

#### Option C: Clone and build from source
```bash
# Clone the repository
git clone https://github.com/fuko2935/gitglow.git
cd gitglow

# Install dependencies and build
npm install
npm run build

# Link globally for terminal-wide usage
npm link
```

### 3. API Key Setup (Optional)
To leverage the full AI capability, add your OpenAI API key to your environment variables:
```bash
export OPENAI_API_KEY="sk-..."
```
> [!TIP]
> If `OPENAI_API_KEY` is not present, GitGlow will automatically fallback to its built-in heuristic mock generator so that it never breaks your dev workflow!

---

## 📖 Command Guide

### `gitglow commit`
Analyze staged changes and generate an AI-powered Conventional Commit.

```bash
gitglow commit [options]
```

**Options:**
- `--force-mock`: Force mock response for offline/keyless testing.

**Interactive Workflow:**
1. GitGlow runs `git status` to verify staged changes.
2. Compiles a cached diff.
3. Requests AI to build a Conventional Commit message.
4. Renders an interactive confirmation prompt:
   - **Commit directly**: Stages and executes the commit with the AI message.
   - **Edit**: Opens a terminal editor to refine the message manually.
   - **Regenerate**: Dispatches another request to OpenAI.
   - **Cancel**: Terminates execution cleanly.

---

### `gitglow scan`
Audit all currently staged changes for hardcoded API keys or high-risk secrets.

```bash
gitglow scan
```

**Security Policy Regexes:**
- **AWS API Key**: Matches standard AWS tokens (`AKIA`, `ASIA`, etc.)
- **OpenAI API Key**: Scans for standard and modern `sk-` credentials.
- **GitHub Token**: Captures personal access tokens (`ghp_`, `gho_`, etc.)
- **Private SSH Key**: Detects standard private keys (`-----BEGIN ... PRIVATE KEY-----`)

> [!CAUTION]
> If any credential matches are discovered, GitGlow immediately halts execution and prints the target filename, violating line, and secure instructions.

---

### `gitglow pr <baseBranch>`
Compares your current branch against `<baseBranch>` (e.g. `main`) and creates a structured Markdown PR template.

```bash
gitglow pr <baseBranch> [options]
```

**Options:**
- `--force-mock`: Force mock response for offline/keyless testing.

**What is generated:**
- 🛠️ **Summary of Proposed Changes**
- 🧩 **Modified Scope & Architecture Details**
- 🧪 **Verification & Test Status**

---

## ⚙️ Configuration

You can customize GitGlow on a per-project level by adding a `.gitglow.json` file in the root of your repository:

```json
{
  "language": "en",
  "conventionalTypes": [
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "build",
    "ci",
    "chore"
  ],
  "openaiApiKey": "sk-..."
}
```

### Config Options
| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `language` | `string` | `"en"` | Target language for AI text generation. |
| `conventionalTypes` | `string[]` | `["feat", "fix", ...]` | Approved Conventional Commit scopes/types. |
| `openaiApiKey` | `string` | `undefined` | Project-specific API key (takes secondary priority to `process.env.OPENAI_API_KEY`). |

---

## 🧪 Testing

GitGlow is backed by a fully mocked, lightning-fast test suite running on **Vitest**. No internet connection or active API keys are required to execute unit and integration tests.

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

---

## 📄 License

This project is licensed under the Apache License 2.0. See the LICENSE file for details.
