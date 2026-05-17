# HandoffKit

[![CI](https://github.com/kingkyylian/handoffkit/actions/workflows/ci.yml/badge.svg)](https://github.com/kingkyylian/handoffkit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@kingkyylian/handoffkit.svg)](https://www.npmjs.com/package/@kingkyylian/handoffkit)
[![Node](https://img.shields.io/badge/node-%3E%3D22-43853d.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

HandoffKit turns messy AI-assisted coding work into a clean, safe context packet you can paste into Codex, Claude Code, Cursor, Gemini, ChatGPT, or another agent.

It is a local-first TypeScript CLI. It inspects the current git repository, summarizes the working state, detects agent instruction files, finds package verification scripts, redacts likely secrets, and prints a compact Markdown handoff by default. It does not call any LLM API.

## Why It Exists

AI coding sessions often leave important context spread across terminal output, git status, diffs, TODOs, and repo-specific instruction files. Pasting all of that manually is noisy and risky. HandoffKit creates a deterministic handoff packet with the pieces another assistant needs first:

- current branch and git status
- recent commits
- staged and unstaged diff summaries
- changed file list
- detected instruction files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, and `.github/copilot-instructions.md`, with compact redacted previews
- package manager and common verification scripts from `package.json`
- best-effort redaction for likely secrets

## HandoffKit vs. AgentFit-Style Repo Instruction Tools

Repo instruction tools such as AgentFit help shape reusable project guidance for AI agents. HandoffKit has a different job: it captures the live state of a coding session right now.

Use repo instruction tools to maintain durable agent rules. Use HandoffKit when you need to hand off an in-progress branch, debugging session, or partially completed change to another assistant without pasting raw diffs and secrets by hand.

## Install

Run without installing:

```sh
pnpm dlx @kingkyylian/handoffkit pack --goal "Make your own goal"
```

Or install it globally:

```sh
pnpm add -g @kingkyylian/handoffkit
```

For local development:

```sh
pnpm install
pnpm build
```

Node.js 22 or newer is required.

## Usage

From inside a git repository:

```sh
handoffkit pack --goal "Make your own goal"
```

During development:

```sh
pnpm dev pack --goal "Make your own goal"
```

Write to a file:

```sh
handoffkit pack --goal "Finish the CLI MVP" --output handoff.md
```

JSON output:

```sh
handoffkit pack --goal "Review this branch" --format json
```

Include full patch text:

```sh
handoffkit pack --goal "Continue implementation" --include-diff
```

Omit diff summaries and patches:

```sh
handoffkit pack --goal "Summarize repo state" --no-diff
```

Set a rough Markdown token budget:

```sh
handoffkit pack --goal "Prepare a compact handoff" --budget 3000
```

## CLI Options

| Option | Description |
| --- | --- |
| `--goal <text>` | The handoff goal to place at the top of the packet. |
| `--output <path>` | Write the packet to a file instead of stdout. |
| `--format markdown\|json` | Render Markdown or JSON. Defaults to Markdown. |
| `--budget <tokens>` | Rough Markdown token budget. Defaults to `4000`. |
| `--include-diff` | Include full tracked patches and bounded untracked previews. |
| `--no-diff` | Omit diff summaries and full patches. |

## What Gets Collected

HandoffKit reads local git and filesystem metadata from the current repository:

- branch, status, recent commits, changed files, and diff summaries
- full tracked patch text only when `--include-diff` is used
- untracked file names in summaries, and untracked file preview content only when `--include-diff` is used
- compact previews of detected instruction files
- package manager and verification scripts from the root `package.json`

## What Never Happens

- No LLM API calls.
- No network requests from the CLI.
- No git writes, commits, staging, or branch changes.
- No files are written unless `--output` is provided.

## Development

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check
pnpm pack:dry-run
```

## Release

Releases are published manually from GitHub Actions. Update `CHANGELOG.md`, bump `package.json`, push the commit, then run the `Release` workflow for the selected ref. The workflow builds, tests, and publishes to npm with provenance.

## Security Model

HandoffKit is local-first and deterministic. It reads local git and filesystem state, renders a report, and redacts likely secrets from generated output. Redaction is best effort, so review packets before pasting them into a third-party tool.

## License

MIT
