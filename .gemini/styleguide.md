# Gemini Code Review Style Guide

Review with a senior engineer mindset. Prioritize concrete defects over taste.

## Priority Order

1. Correctness bugs
2. Security, auth, privacy, and data loss risks
3. Broken async behavior, cache behavior, race conditions, and idempotency
4. Missing tests for changed behavior
5. Performance regressions
6. UI overflow, mobile layout, accessibility, and Safari-sensitive rendering issues
7. Maintainability issues that directly affect this change

## Review Rules

- Do not request unrelated refactors.
- Do not ask for abstraction unless it removes real duplication or risk.
- Prefer existing project patterns over new conventions.
- Flag missing verification when code, config, schema, or runtime behavior changes.
- Treat generated files, lockfiles, build outputs, coverage output, local databases, and vendored code as review noise unless the PR explicitly changes generation behavior.
- For HandoffKit CLI changes, check that commands stay local-first, deterministic, redacted, and free of implicit git writes.
- For package/release changes, check installability, entrypoints, changelog accuracy, and release smoke coverage.
- For cache, resume, checkpoint, or output changes, check that generated artifacts are explicit and safe to paste into another agent.
- For frontend changes, check loading, empty, error, mobile, and desktop states.
- For API or data changes, check schema validation, auth boundaries, migration/backfill risk, and idempotency.
- For scripts and CLI changes, check representative command behavior and failure modes.
- For documentation-only changes, check factual accuracy, commands, paths, and stale references.

## Comment Style

- Lead with the bug or risk.
- Include the affected file and line when possible.
- Explain why the issue matters.
- Suggest a narrow fix.
- Avoid praise, jokes, or broad commentary.

## What Not To Comment On

- Personal formatting preferences already handled by formatter/linter.
- Alternative architecture that is unrelated to the PR goal.
- Minor naming suggestions unless the name causes real ambiguity.
- Generated dependency changes unless they are suspicious or inconsistent.
