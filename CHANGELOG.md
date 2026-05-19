# Changelog

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
