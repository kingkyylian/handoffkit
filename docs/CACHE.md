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

## Inspect

```sh
handoffkit cache list
handoffkit cache list --format json
handoffkit cache show resume latest
handoffkit cache show verification latest --format json
handoffkit cache export resume latest --output resume-cache.json
handoffkit cache import resume-cache.json
```

`cache list` shows local artifacts with kind, name, creation time, and path.
`cache show` prints a single cache envelope.
`cache export` writes one redacted cache envelope to a portable JSON file.
`cache import` validates a portable cache envelope and writes it into the current repository cache as both `latest.json` and a timestamped snapshot.

## Reuse

```sh
handoffkit resume --from-cache latest --goal "Continue cached session"
handoffkit resume --from-cache resume/latest --goal "Continue cached session"
handoffkit pack --goal "Hand off with cache context" --include-cache
```

`resume --from-cache` reads `.handoffkit/resume/<name>.json` and uses the stored `source` as the resume source.
`pack --include-cache` includes bounded artifact summaries only; it does not embed full cache JSON payloads.
