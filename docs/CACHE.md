# Local Cache

HandoffKit can write explicit local artifacts under `.handoffkit/` when a command is run with `--cache`.
The cache is local-only, ignored by Git by default, and never written unless the flag is provided.

## Layout

```text
.handoffkit/
  verification/
    latest.json
    <timestamp>.json
  resume/
    latest.json
    <timestamp>.json
```

- `verification/`: results from `handoffkit verify --cache` or `handoffkit pack --verify --cache`.
- `resume/`: parsed resume source and state from `handoffkit resume <path> --cache`.
- `latest.json`: overwritten with the newest artifact for the kind.
- `<timestamp>.json`: append-only snapshot using the artifact creation time.

Each artifact is a JSON envelope:

```json
{
  "version": 1,
  "kind": "verification",
  "createdAt": "2026-05-20T13:00:00.000Z",
  "data": {}
}
```

Artifact contents are redacted with the same best-effort redactor used for CLI output.
