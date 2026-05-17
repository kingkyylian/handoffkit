# Roadmap

HandoffKit is focused on one niche: clean handoff and resume packets for interrupted AI coding sessions.

It should not become a generic repo-to-context dumper. Existing tools already cover that space well. The roadmap below prioritizes features that make handoff quality better than a manual paste.

## Near Term

### `handoffkit pack --since <ref>`

Summarize the meaningful branch delta relative to a base ref such as `main`:

```sh
handoffkit pack --since main --goal "Continue this branch"
```

Expected behavior:

- compare current branch against the base ref
- include changed files and commits only from the branch delta
- reduce noise from unrelated working tree history
- keep deterministic local output

### `handoffkit verify`

Run detected verification commands and include the result in the packet:

```sh
handoffkit verify
handoffkit pack --goal "Fix remaining failures"
```

Expected behavior:

- choose safe scripts such as `typecheck`, `lint`, `test`, `build`
- capture command, exit code, duration, and tail output
- avoid running arbitrary destructive scripts
- optionally write a verification block that `pack` can include

### Agent-Specific Output

Optimize handoff shape for target agents:

```sh
handoffkit pack --for codex
handoffkit pack --for claude
handoffkit pack --for cursor
```

Expected behavior:

- keep the same source facts
- adjust section order, headings, and action prompts for the target tool
- avoid tool-specific claims that cannot be verified locally

## Mid Term

### `handoffkit risk`

Produce deterministic risk notes from changed files and package signals:

```sh
handoffkit risk
```

Expected behavior:

- flag likely test gaps
- note config, auth, security, migration, packaging, or CI-sensitive changes
- stay rule-based unless an explicit local model integration is added later

### `handoffkit resume`

Generate a fresh packet from a previous handoff, transcript, or interrupted session notes:

```sh
handoffkit resume previous-handoff.md --goal "Continue from here"
```

Expected behavior:

- extract prior goal, completed work, remaining tasks, and verification state
- merge with current git state
- produce a clean next-agent packet

### Stronger Secret Scanning

Keep regex redaction as the default, then add optional integrations:

- `secretlint`
- `gitleaks`
- provider-specific token patterns

These must remain local-first and opt-in when they require extra binaries.

## Non-Goals

- No LLM API calls in the core CLI.
- No telemetry.
- No generic full-repo context dumping as the primary product.
- No git writes unless a command explicitly asks for an output file or cache artifact.
