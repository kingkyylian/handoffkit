# Cache-Backed Handoff Example

Use this flow when you want the next agent session to reuse local verification or resume context without manually opening `.handoffkit` JSON files.

## Capture

```sh
handoffkit verify --cache
handoffkit resume previous-handoff.md --goal "Continue release work" --cache
```

## Inspect

```sh
handoffkit cache list
handoffkit cache show resume latest
```

## Reuse

```sh
handoffkit resume --from-cache latest --goal "Continue cached session"
handoffkit pack --goal "Prepare cache-aware handoff" --include-cache
```

The cache remains local and ignored by Git. `pack --include-cache` includes artifact summaries, not full cache payloads.
