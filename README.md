# HandoffKit

[![CI](https://github.com/kingkyylian/handoffkit/actions/workflows/ci.yml/badge.svg)](https://github.com/kingkyylian/handoffkit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@kingkyylian/handoffkit.svg)](https://www.npmjs.com/package/@kingkyylian/handoffkit)
[![Node](https://img.shields.io/badge/node-%3E%3D22-43853d.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

HandoffKit is the clean handoff packet for interrupted AI coding sessions.

It turns messy AI-assisted coding work into a safe resume packet you can paste into Codex, Claude Code, Cursor, Gemini, ChatGPT, or another agent. It is a local-first TypeScript CLI: it inspects the current git repository, summarizes the live branch state, detects agent instruction files, finds package verification scripts, redacts likely secrets, and prints compact Markdown by default. It does not call any LLM API.

## Why It Exists

AI coding sessions get interrupted: context windows fill up, tools change, laptops sleep, a model gets stuck, or work needs to move from Claude Code to Codex or Cursor. The hard part is not feeding an entire repo to an agent. The hard part is explaining what happened on this branch and what the next agent should do.

HandoffKit creates a deterministic handoff packet with the pieces another assistant needs first:

- current branch and git status
- recent commits
- staged and unstaged diff summaries
- changed file list
- detected instruction files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, and `.github/copilot-instructions.md`, with compact redacted previews
- package manager and common verification scripts from `package.json`
- best-effort redaction for likely secrets

## Positioning

HandoffKit is not a repo ingestion tool. It is not trying to replace Repomix, Gitingest, or long-lived repo instruction tools.

Its job is narrower: capture the live state of an interrupted AI coding session so another agent can resume without guessing.

## HandoffKit vs. Repo Instruction Tools

Repo instruction tools such as AgentFit help shape reusable project guidance for AI agents. HandoffKit has a different job: it captures the live state of a coding session right now.

Use repo instruction tools to maintain durable agent rules. Use HandoffKit when you need to hand off an in-progress branch, debugging session, or partially completed change to another assistant without pasting raw diffs and secrets by hand.

## Current MVP

The first release focuses on the minimum useful handoff:

- local git state
- changed files
- recent commits
- diff summaries and optional patches
- agent instruction file previews
- package verification scripts
- best-effort secret redaction

It is useful today, but the goal is to become more than a prettier `git status`. See [ROADMAP.md](ROADMAP.md) for the next features that should make HandoffKit harder to replace with a manual paste.

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

Focus on the branch delta since a base ref:

```sh
handoffkit pack --since main --goal "Continue this branch"
```

Run safe verification scripts and include the result:

```sh
handoffkit pack --verify --goal "Fix remaining failures"
```

Run optional local secret scanners and include bounded redacted results:

```sh
handoffkit pack --scan-secrets --goal "Review before handoff"
```

Optimize the packet for a target agent:

```sh
handoffkit pack --for codex --goal "Resume implementation"
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

Run verification directly:

```sh
handoffkit verify
```

Inspect deterministic risk notes:

```sh
handoffkit risk
```

Run optional local secret scanners directly:

```sh
handoffkit scan-secrets
```

Resume from a previous handoff or transcript:

```sh
handoffkit resume previous-handoff.md --goal "Continue from here"
```

## CLI Options

| Option | Description |
| --- | --- |
| `--goal <text>` | The handoff goal to place at the top of the packet. |
| `--output <path>` | Write the packet to a file instead of stdout. |
| `--format markdown\|json` | Render Markdown or JSON. Defaults to Markdown. |
| `--for generic\|codex\|claude\|cursor` | Tune the packet heading and prompt shape for a target agent. |
| `--budget <tokens>` | Rough Markdown token budget. Defaults to `4000`. |
| `--since <ref>` | Focus committed branch delta on a base ref such as `main`. |
| `--verify` | Run safe verification scripts and include results in the packet. |
| `--scan-secrets` | Run optional local secret scanners and include bounded redacted results. |
| `--include-diff` | Include full tracked patches and bounded untracked previews. |
| `--no-diff` | Omit diff summaries and full patches. |

## What Gets Collected

HandoffKit reads local git and filesystem metadata from the current repository:

- branch, status, recent commits, changed files, and diff summaries
- full tracked patch text only when `--include-diff` is used
- untracked file names in summaries, and untracked file preview content only when `--include-diff` is used
- compact previews of detected instruction files
- package manager and verification scripts from the root `package.json`
- optional verification results when `--verify` is used
- deterministic risk notes from changed file paths
- optional secret scanner availability, local config files, and install guidance for `gitleaks` and `secretlint`
- bounded, redacted secret scan results when `--scan-secrets` is used

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

Releases are manual and should happen only after CI, package dry-run, and install smoke tests pass. The preferred path is the GitHub `Release` workflow with an `NPM_TOKEN` repository secret that can publish from CI without an interactive OTP, so npm provenance is attached to the published package.

See [docs/RELEASE.md](docs/RELEASE.md) for the release checklist.

## Security Model

HandoffKit is local-first and deterministic. It reads local git and filesystem state, renders a report, and redacts likely secrets from generated output. Redaction is best effort, so review packets before pasting them into a third-party tool.

When `--scan-secrets` is used, HandoffKit runs installed local scanners only. It does not install scanners, send code to a service, or fail when `gitleaks` or `secretlint` is missing.

When scanner config files such as `.gitleaks.toml`, `.gitleaksignore`, `.secretlintrc.*`, or `secretlint.config.*` are present, HandoffKit reports them in the packet so the next agent knows which local policy files exist.

## License

MIT
