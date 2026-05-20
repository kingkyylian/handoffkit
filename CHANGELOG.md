# Changelog

## 0.4.0

- Added `handoffkit cache list` and `handoffkit cache show` for inspecting local `.handoffkit` artifacts.
- Added `handoffkit resume --from-cache latest` and cache refs such as `resume/latest` for continuing from cached resume sources.
- Added `handoffkit pack --include-cache` to include recent cache summaries in handoff packets.
- Added cache-backed handoff workflow documentation and an end-to-end example.

## 0.3.0

- Added richer deterministic risk notes that map changed file groups to common failure modes across release, CI, tooling, CLI, resume, report rendering, docs, security, and generated artifact workflows.
- Raised release and package publishing changes to high-severity risk guidance with explicit `pnpm pack:dry-run` and `pnpm smoke:release` verification prompts.
- Added transcript parsing for Codex, Claude, Cursor, and Gemini-style exported or copied agent sessions.
- Added opt-in local `.handoffkit` cache artifacts for `verify --cache`, `resume --cache`, and `pack --verify --cache`.
- Documented the `.handoffkit` cache layout and kept cache/checkpoint artifacts out of changed-file reports by default.

## 0.2.0

- Added meaningful target-specific Markdown profiles for Codex, Claude Code, Cursor, and generic handoffs.
- Made `--for` adjust packet titles, section order, and next-agent action notes while preserving the same collected source facts.
- Added local secret scanner config discovery for `gitleaks` and `secretlint`.
- Added scanner installation and config guidance when optional local scanners are unavailable.
- Fixed secret redaction so scanner names such as `secretlint` are not mistaken for secret assignment keys.
- Updated tests to cover target profile rendering, unchanged JSON source facts across targets, scanner config discovery, direct `scan-secrets` guidance, and scanner-name redaction.

## 0.1.1

- Added automated release tarball install smoke testing.
- Improved first-run CLI help and non-git error messages.
- Prepared GitHub Actions npm publishing with provenance.
- Added structured resume state parsing and Markdown rendering for prior handoffs and checkpoints.

## 0.1.0

- Initial TypeScript ESM CLI scaffold.
- Added `handoffkit pack`.
- Added Markdown and JSON reports.
- Added git status, recent commit, changed file, diff summary, and optional diff collection.
- Added instruction file detection with compact redacted previews.
- Added package manager and verification script detection.
- Added best-effort secret redaction.
- Added `pack --since`, `pack --verify`, and `pack --for`.
- Added `verify`, `risk`, and `resume` commands.
- Added deterministic risk notes.
- Added optional `gitleaks` and `secretlint` availability metadata and bounded redacted scan results.
- Added release checklist documentation and CI package dry-run validation.
- Added unit and integration tests.
