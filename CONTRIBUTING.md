# Contributing

Thanks for working on HandoffKit.

## Local Setup

```sh
pnpm install
pnpm check
pnpm pack:dry-run
```

Node.js 22 or newer is required.

## Development Rules

- Keep the CLI local-first and deterministic.
- Do not add LLM API calls or telemetry.
- Add focused tests for behavior changes.
- Keep generated handoff output redacted by default.
- Prefer small, readable modules over framework-heavy abstractions.

## Pull Request Checklist

- `pnpm check`
- `pnpm pack:dry-run`
- Manual smoke test: `pnpm dev pack --goal "Make your own goal"`
