# AGENTS.md

@/Users/kyylian/.codex/RTK.md
@/Users/kyylian/.codex/CLAUDE-MEM.md
@/Users/kyylian/.codex/KYYLIAN-PREFS.md
@/Users/kyylian/.codex/CODEX-WORKFLOW.md

## Project Workflow

- Use issue-first development for non-trivial work.
- Link PRs to issues with `Closes #123`, `Fixes #123`, or `Resolves #123`.
- Keep PR descriptions in Problem / Cozum / Test / Risk format.
- Treat Gemini review as assistive signal; CI and human review remain authoritative.
- Do not commit generated databases, build outputs, coverage output, or local caches.
- Before marking work complete, run the closest relevant verification command and report it.

## Project-Specific Notes

### Architecture

- HandoffKit is a local-first TypeScript ESM CLI for deterministic AI coding
  session handoff packets.
- Commander command wiring lives in `src/cli/commands/`, with the top-level CLI
  entrypoint in `src/cli/index.ts`.
- Deterministic collectors and domain logic live in `src/core/`.
- Markdown, JSON, and target-agent rendering lives in `src/report/`.
- Shared public shapes live in `src/types.ts`.

### Commands

- `pnpm typecheck`: TypeScript validation.
- `pnpm lint`: ESLint validation.
- `pnpm test`: Vitest test suite.
- `pnpm build`: Build the CLI with tsup.
- `pnpm check`: typecheck, lint, tests, and build.
- `pnpm pack:dry-run`: npm package dry run.
- `pnpm smoke:release`: release smoke checks against the built package.

### Test Strategy

- Unit tests live under `tests/unit/`.
- CLI and git-backed integration tests live under `tests/integration/`.
- Resume and transcript fixtures live under `tests/fixtures/`.
- Add focused tests for behavior changes, especially report rendering, redaction,
  git state collection, cache/resume behavior, and user-facing CLI output.

### Risk Areas

- Redaction and secret scanner output must not leak likely credentials.
- CLI commands must not perform implicit git writes, commits, staging, pushes, or
  network calls.
- Cache and checkpoint artifacts must be explicit, redacted, and ignored unless a
  command intentionally writes a user-requested output file.
- Release/package changes require `pnpm check`, `pnpm pack:dry-run`, and
  `pnpm smoke:release` before publishing.
- Markdown and JSON output shape is user-facing; treat section removals or field
  renames as compatibility-sensitive.

### Generated Artifacts

- Do not commit `dist/`, coverage output, local databases, `.handoffkit/`,
  temporary checkpoint smoke files, npm cache output, or package tarballs.
- Keep lockfile changes only when they are the intended result of dependency
  work.
