# Roadmap

HandoffKit is focused on one niche: clean handoff and resume packets for interrupted AI coding sessions.

It should not become a generic repo-to-context dumper. Existing tools already cover that space well. The roadmap below prioritizes features that make handoff quality better than a manual paste.

## Implemented MVP Surface

These are implemented as local-first deterministic features:

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

### `handoffkit pack --verify` and `handoffkit verify`

Run detected verification commands and include the result in the packet:

```sh
handoffkit verify
handoffkit pack --goal "Fix remaining failures"
```

Expected behavior:

- choose safe scripts such as `typecheck`, `lint`, `test`, `build`
- capture command, exit code, duration, and tail output
- avoid running arbitrary destructive scripts
- include verification in a handoff packet when `pack --verify` is used

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
- support fixture-backed Claude Code JSONL, Codex raw text, Cursor Markdown, and Gemini copied response transcript shapes

### Stronger Secret Scanning

Regex redaction remains the default. HandoffKit detects optional local scanners and can run bounded local scans with `pack --scan-secrets` or `scan-secrets`:

- `secretlint`
- `gitleaks`
- provider-specific token patterns

Scan results are bounded and redacted before rendering.

Scanner status also reports common local config files such as `.gitleaks.toml`, `.gitleaksignore`, `.secretlintrc.*`, and `secretlint.config.*`. When a scanner is not installed, the packet includes local installation and config guidance without installing anything automatically.

### Hardening and Release Safety

Recent releases added tighter handoff safety:

- bounded verification execution with destructive-script skipping
- safer untracked file previews for `--include-diff`
- scanner execution timeouts and gitleaks temporary report cleanup
- release smoke testing for packaged CLI installs

### Portable Cache Artifacts

Move explicit `.handoffkit` cache artifacts between clones without copying internal cache directories:

```sh
handoffkit cache export resume latest --output resume-cache.json
handoffkit cache import resume-cache.json
```

Expected behavior:

- export a selected resume or verification cache envelope as redacted JSON
- validate imported cache envelopes before writing them
- restore imported artifacts as both `latest.json` and a timestamped snapshot
- keep import/export explicit so normal pack, resume, and verify commands remain local-read-only unless `--cache` or `--output` is used

### `handoffkit checkpoint save`

Write durable local progress checkpoints that can be resumed later:

```sh
handoffkit checkpoint save --goal "Continue this branch"
handoffkit resume docs/checkpoints/LATEST.md --goal "Continue from checkpoint"
```

Expected behavior:

- require an explicit checkpoint command before writing files
- create a timestamped Markdown checkpoint and update `docs/checkpoints/LATEST.md`
- support `--output-dir` for custom checkpoint directories
- support `--verify` for including safe verification results
- keep checkpoint output redacted and local-first

## Next Up

- Make `risk` rules richer by mapping changed files to common failure modes.
- Add more resume rendering examples for cross-agent handoff packets.
- Add configurable verification policy for teams that want stricter or looser script allowlists.
- Add cache pruning and retention controls for `.handoffkit` artifacts.

## Non-Goals

- No LLM API calls in the core CLI.
- No telemetry.
- No generic full-repo context dumping as the primary product.
- No git writes unless a command explicitly asks for an output file or cache artifact.
