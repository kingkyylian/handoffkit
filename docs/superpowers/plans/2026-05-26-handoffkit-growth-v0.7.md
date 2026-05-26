# HandoffKit Growth And v0.7.0 Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. In Codex, use `executing-plans` inline unless the user explicitly asks for subagents or parallel agent work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move HandoffKit from a clean but low-visibility `v0.6.0` release to a more credible OSS project with sharper positioning, clean GitHub intake, and one concrete `v0.7.0` product improvement.

**Architecture:** Work in small issue-linked changes. First remove repo hygiene friction, then improve first-read conversion with verified examples, then ship an explicit checkpoint feature using the existing local-first report collection, redaction, and Commander command patterns.

**Tech Stack:** TypeScript ESM, Commander, Vitest, pnpm, GitHub CLI/API, npm package publishing.

---

## Baseline

- Current release: `@kingkyylian/handoffkit@0.6.0`, GitHub release and npm `latest` both published.
- Current branch: `main` synced with `origin/main` at `1d61555 Release v0.6.0`.
- GitHub stars: `0`; stargazers API returned `[]`.
- Traffic signal: GitHub traffic showed `358` clones / `165` unique cloners and `23` views / `8` unique viewers in the available window.
- Open GitHub issue count is effectively from PRs; `gh issue list` returned no normal open issues.
- Open PR: `#18` Dependabot `typescript-eslint 8.59.3 -> 8.59.4`, checks passed.
- Local untracked files: `AGENTS.md`, `.gemini/config.yaml`, `.gemini/styleguide.md`, `.github/labels.yml`, and new issue templates.
- Existing tracked issue templates already include `.github/ISSUE_TEMPLATE/bug_report.yml` and `.github/ISSUE_TEMPLATE/feature_request.yml`, so the new templates need cleanup instead of blind addition.

## Workstreams

1. **Trust and maintenance:** merge the ready Dependabot PR, normalize issue templates and labels, and make repo agent instructions project-specific.
2. **Conversion:** sharpen README first screen, add copy/paste examples from real commands, and make the package easier to evaluate in under two minutes.
3. **Product value:** ship `handoffkit checkpoint` as `v0.7.0`, because it turns the current project-checkpoint workflow into a product feature aligned with the roadmap.
4. **Distribution:** publish a focused release and share the exact use case where HandoffKit is strongest.

## File Map

- Modify `.github/ISSUE_TEMPLATE/bug_report.yml`: keep one bug template or replace it with the stronger new bug template.
- Modify `.github/ISSUE_TEMPLATE/feature_request.yml`: keep one feature template or replace it with the stronger new feature template.
- Create `.github/ISSUE_TEMPLATE/task.yml`: maintenance/tooling work template.
- Avoid `.github/ISSUE_TEMPLATE/content-quality.yml` unless the repo truly has content-quality workflows; it looks imported from another project.
- Modify `.github/ISSUE_TEMPLATE/config.yml`: keep security advisory link and disable blank issues only if templates cover enough intake.
- Create `.github/labels.yml`: labels used by templates, including `bug`, `feature`, `task`, `quality`, and `triage`.
- Modify `AGENTS.md`: replace placeholder notes with real architecture, commands, test strategy, release risk areas, and generated artifact policy.
- Modify `README.md`: first screen, quickstart, problem framing, example output, and package credibility.
- Create or modify `examples/`: add one realistic handoff packet example and one resume/checkpoint example.
- Modify `ROADMAP.md`: promote checkpoint automation from "Next Up" to implemented once shipped.
- Modify `CHANGELOG.md`: add `0.7.0` section before release.
- Create `src/core/checkpoint.ts`: deterministic checkpoint rendering and file write helpers.
- Create `src/cli/commands/checkpoint.ts`: Commander command for explicit checkpoint writes and latest resume.
- Modify `src/cli/index.ts`: register the checkpoint command and bump CLI version during release.
- Modify `src/types.ts`: add checkpoint option/result types only if the implementation needs shared exported shapes.
- Create `tests/unit/checkpoint.test.ts`: render and path behavior.
- Create `tests/integration/checkpoint-command.test.ts`: CLI command writes timestamped and latest files in a temp git repo.
- Modify `docs/RELEASE.md`: add release checklist item for `handoffkit checkpoint` smoke.

---

## Task 1: Create Issue Backbone

**Files:**
- No local file changes required.
- GitHub issues to create via `gh`.

- [x] **Step 1: Create the repo-hygiene issue**

Run:

```bash
rtk gh issue create --repo kingkyylian/handoffkit --title "Normalize GitHub intake and repo agent guidance" --label task --body "Problem: v0.6.0 is released, but local repo governance files are half-staged and issue templates are duplicated.\n\nScope:\n- Merge or replace duplicate issue templates.\n- Add labels used by templates.\n- Make AGENTS.md project-specific.\n- Keep generated output, caches, lockfiles, and local artifacts out of git.\n\nAcceptance:\n- [ ] Only one bug template and one feature template remain.\n- [ ] Task template exists for maintenance work.\n- [ ] Labels referenced by templates exist in .github/labels.yml and on GitHub.\n- [ ] AGENTS.md has concrete architecture, commands, test strategy, and risk areas.\n- [ ] Verification command is run and reported."
```

Expected: GitHub returns a new issue URL.

Result: https://github.com/kingkyylian/handoffkit/issues/19

- [x] **Step 2: Create the conversion issue**

Run:

```bash
rtk gh issue create --repo kingkyylian/handoffkit --title "Improve README conversion and examples" --label task --body "Problem: GitHub shows traffic but 0 stars, which suggests visitors are not quickly seeing why HandoffKit matters.\n\nScope:\n- Sharpen the first README screen.\n- Add a two-minute quickstart.\n- Add realistic before/after output examples.\n- Clarify when to use HandoffKit versus repo dumpers and instruction tools.\n- Verify every documented command.\n\nAcceptance:\n- [ ] README explains the problem and payoff in the first screen.\n- [ ] Quickstart works with the published package or local dev command.\n- [ ] Examples are generated or verified from the current CLI.\n- [ ] ROADMAP remains accurate.\n- [ ] Documentation-only verification is reported."
```

Expected: GitHub returns a new issue URL.

Result: https://github.com/kingkyylian/handoffkit/issues/20

- [x] **Step 3: Create the v0.7.0 product issue**

Run:

```bash
rtk gh issue create --repo kingkyylian/handoffkit --title "Add explicit checkpoint command for durable handoffs" --label feature --body "Problem: HandoffKit can generate handoff and resume packets, but users still need to manually decide where durable progress files live.\n\nScope:\n- Add a local-first explicit checkpoint command.\n- Write timestamped checkpoint files and docs/checkpoints/LATEST.md only when the checkpoint command is invoked.\n- Reuse existing git, package, risk, redaction, verification, and markdown patterns.\n- Add unit and integration tests.\n- Document the workflow and release it as v0.7.0.\n\nAcceptance:\n- [ ] handoffkit checkpoint save --goal \"...\" writes docs/checkpoints/<timestamp>.md and docs/checkpoints/LATEST.md.\n- [ ] --output-dir overrides docs/checkpoints.\n- [ ] --verify includes safe verification results when requested.\n- [ ] Output is redacted.\n- [ ] resume can consume docs/checkpoints/LATEST.md.\n- [ ] pnpm check and pack dry run pass."
```

Expected: GitHub returns a new issue URL.

Result: https://github.com/kingkyylian/handoffkit/issues/21

Additional Task 1 setup completed:

- Created GitHub label `task`.
- Created GitHub label `feature`.
- Created GitHub label `triage`.
- Created GitHub milestone `v0.7.0`: https://github.com/kingkyylian/handoffkit/milestone/7

---

## Task 2: Resolve Ready Dependency PR

**Files:**
- Dependabot branch files only, through PR merge.

- [x] **Step 1: Re-check PR status**

Run:

```bash
rtk gh pr view 18 --repo kingkyylian/handoffkit --json number,title,state,mergeable,statusCheckRollup
```

Expected: PR is open, mergeable, and checks are passing.

Result: PR #18 was open, `MERGEABLE`, and CI `verify` check was `SUCCESS`.

- [x] **Step 2: Merge the Dependabot PR**

Run:

```bash
rtk gh pr merge 18 --repo kingkyylian/handoffkit --squash --delete-branch
```

Expected: PR merges to `main` and branch deletion succeeds or is already handled by repo settings.

Result: PR #18 merged on 2026-05-26 at merge commit `44c2908581c6e134f74a14c93aa97d96ac7dd86f`.

- [x] **Step 3: Sync local main**

Run:

```bash
rtk git pull --ff-only
```

Expected: local `main` fast-forwards to the merged dependency update.

Result: local `main` fast-forwarded to `44c2908`, synced with `origin/main`.

- [x] **Step 4: Verify after merge**

Run:

```bash
rtk pnpm check
```

Expected: typecheck, lint, tests, and build pass.

Result: `rtk pnpm check` passed; typecheck, lint, 12 Vitest files / 40 tests, and build succeeded.

---

## Task 3: Normalize GitHub Intake And Agent Guidance

**Files:**
- Modify: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Modify: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/ISSUE_TEMPLATE/task.yml`
- Modify: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/labels.yml`
- Modify: `AGENTS.md`

- [x] **Step 1: Remove duplicate issue-template direction**

Decision:

- Keep the existing filenames `bug_report.yml` and `feature_request.yml` so old GitHub template URLs do not break.
- Move the stronger fields from the new untracked `bug.yml` and `feature.yml` into those tracked files.
- Keep `task.yml`.
- Drop `content-quality.yml` unless a content pipeline is added later.

Expected: GitHub issue template list has Bug, Feature request, and Task.

Result: canonical issue template files are `bug_report.yml`, `feature_request.yml`, and `task.yml`; imported `content-quality.yml` and duplicate draft template names were dropped.

- [x] **Step 2: Update labels**

Use this label set in `.github/labels.yml`:

```yaml
- name: bug
  color: d73a4a
  description: Something is broken or regressed.
- name: feature
  color: 0e8a16
  description: New behavior, CLI API, or workflow.
- name: task
  color: 1d76db
  description: Maintenance, tooling, refactor, or operational work.
- name: quality
  color: fbca04
  description: Quality audit, cleanup, or correctness improvement.
- name: docs
  color: 0075ca
  description: Documentation, examples, README, or release notes.
- name: release
  color: 5319e7
  description: Packaging, publishing, changelog, or release automation.
- name: triage
  color: cfd3d7
  description: Needs review, prioritization, or scope clarification.
```

Result: `.github/labels.yml` now documents the repo label set using the existing GitHub `documentation` label rather than adding a duplicate `docs` label.

- [x] **Step 3: Apply labels to GitHub**

Run after committing the label file:

```bash
rtk gh label sync --repo kingkyylian/handoffkit --force .github/labels.yml
```

Expected: GitHub labels match `.github/labels.yml`.

Result: this GitHub CLI installation does not provide `gh label sync`; labels were applied with `gh label create` / `gh label edit`. GitHub now has `bug`, `feature`, `quality`, `documentation`, `release`, `roadmap`, `task`, and `triage` matching the intended colors/descriptions.

- [x] **Step 4: Replace `AGENTS.md` placeholder notes**

`AGENTS.md` must include these repo-specific facts:

- Architecture: TypeScript ESM CLI, Commander commands in `src/cli/commands`, core deterministic collectors in `src/core`, renderers in `src/report`.
- Commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm check`, `pnpm pack:dry-run`, `pnpm smoke:release`.
- Tests: unit tests under `tests/unit`, command/integration tests under `tests/integration`, fixture data under `tests/fixtures`.
- Risk areas: redaction, git writes, secret scanning, release packaging, cache/checkpoint artifacts, user-facing CLI output.
- Policy: no LLM APIs, no telemetry, no implicit git writes, no generated databases/build output/coverage/local caches in commits.

Result: `AGENTS.md` now documents HandoffKit architecture, commands, test strategy, risk areas, and generated artifact policy. `.gemini` review config/styleguide were kept because they are repo governance files and now include HandoffKit-specific review guidance.

- [x] **Step 5: Verify repo hygiene change**

Run:

```bash
rtk pnpm check
git diff --check
```

Expected: `pnpm check` passes and `git diff --check` reports no whitespace errors.

Result: `rtk pnpm check` passed; YAML files parsed with Ruby `YAML.load_file`; `git diff --check` passed; `rtk gh label list --repo kingkyylian/handoffkit --limit 100` confirmed the labels.

- [x] **Step 6: Commit**

Run:

```bash
git add AGENTS.md .github/ISSUE_TEMPLATE/bug_report.yml .github/ISSUE_TEMPLATE/feature_request.yml .github/ISSUE_TEMPLATE/task.yml .github/ISSUE_TEMPLATE/config.yml .github/labels.yml
git commit -m "chore: normalize repository intake"
```

Expected: one commit linked in the issue or PR description with `Closes #<repo-hygiene-issue>` when merged.

Result: commit created as `chore: normalize repository intake` with `Refs #19`.

---

## Task 4: Improve README Conversion And Examples

**Files:**
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Create: `examples/quickstart-pack.md`
- Create: `examples/resume-from-transcript.md`

- [ ] **Step 1: Generate current local quickstart output**

Run:

```bash
pnpm dev pack --goal "Show a compact HandoffKit demo" --no-diff --budget 1800
```

Expected: command prints a deterministic Markdown packet with repository, git status, changed files, package, risk, and secret scanner availability.

- [ ] **Step 2: Generate resume example output**

Run:

```bash
pnpm dev resume tests/fixtures/resume/codex-raw-transcript.txt --goal "Continue from Codex transcript" --no-diff
```

Expected: command prints a packet with `Resume Source` and `Resume State`.

- [ ] **Step 3: Rewrite README first screen**

The first screen should contain, in this order:

1. Badge row.
2. One-sentence value prop: "Create a clean resume packet when an AI coding session gets interrupted."
3. Three bullets:
   - works from local git state
   - redacts likely secrets
   - no LLM API calls or telemetry
4. Two-command quickstart:

```sh
pnpm dlx @kingkyylian/handoffkit pack --goal "Continue this branch"
pnpm dlx @kingkyylian/handoffkit resume previous-handoff.md --goal "Continue from here"
```

5. A compact example packet that is generated or manually verified against the current CLI output.

- [ ] **Step 4: Tighten positioning**

README must answer these questions before the long options table:

- When do I use it?
- What does it collect?
- What does it refuse to do?
- How is it different from Repomix/Gitingest/instruction tools?
- What does `resume` add over just saving a note?

- [ ] **Step 5: Add examples**

Create `examples/quickstart-pack.md` with a short generated packet excerpt.

Create `examples/resume-from-transcript.md` with a short transcript input snippet and generated resume-state excerpt.

Both examples must avoid secrets and must not claim exact output if manually abbreviated. Use "excerpt" in headings when shortened.

- [ ] **Step 6: Verify documented commands**

Run:

```bash
rtk pnpm check
rtk pnpm pack:dry-run
pnpm dev pack --goal "Docs smoke" --no-diff --budget 1800
pnpm dev resume tests/fixtures/resume/codex-raw-transcript.txt --goal "Docs resume smoke"
```

Expected: checks pass; dev commands exit 0 and produce Markdown.

- [ ] **Step 7: Commit**

Run:

```bash
git add README.md ROADMAP.md examples/quickstart-pack.md examples/resume-from-transcript.md
git commit -m "docs: sharpen project positioning"
```

Expected: commit links to the conversion issue in PR body.

---

## Task 5: Implement `handoffkit checkpoint`

**Files:**
- Create: `src/core/checkpoint.ts`
- Create: `src/cli/commands/checkpoint.ts`
- Modify: `src/cli/index.ts`
- Modify: `src/types.ts` only if shared checkpoint types are needed.
- Create: `tests/unit/checkpoint.test.ts`
- Create: `tests/integration/checkpoint-command.test.ts`
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Define command behavior before coding**

Command:

```sh
handoffkit checkpoint save --goal "Continue this branch"
```

Required behavior:

- Requires a git repository.
- Writes `docs/checkpoints/YYYY-MM-DD-HHMM.md`.
- Writes or replaces `docs/checkpoints/LATEST.md`.
- Creates the output directory if missing.
- Redacts rendered content.
- Does not stage, commit, or modify git state except for the explicit checkpoint files.
- Uses `--output-dir <path>` to override `docs/checkpoints`.
- Uses `--verify` to include safe verification results.
- Uses `--for generic|codex|claude|cursor` to reuse target report profiles.
- Uses `--budget <tokens>` with the same positive integer validation as `pack`.

- [ ] **Step 2: Write unit tests for deterministic filename and rendering**

Create `tests/unit/checkpoint.test.ts` with tests covering:

```ts
import { describe, expect, it } from "vitest";

import { checkpointFilename, renderCheckpointMarkdown } from "../../src/core/checkpoint.js";
import type { HandoffReport } from "../../src/types.js";

describe("checkpoint", () => {
  it("creates a minute-level UTC-safe filename", () => {
    expect(checkpointFilename(new Date("2026-05-26T13:04:59.000Z"))).toBe("2026-05-26-1304.md");
  });

  it("renders a checkpoint with resume instructions", () => {
    const report = minimalReport(["README.md"]);
    const markdown = renderCheckpointMarkdown(report, new Date("2026-05-26T13:04:59.000Z"));

    expect(markdown).toContain("# Project Checkpoint - 2026-05-26 13:04");
    expect(markdown).toContain("## Current State");
    expect(markdown).toContain("- `README.md`");
    expect(markdown).toContain("handoffkit resume docs/checkpoints/LATEST.md");
  });
});

function minimalReport(changedFiles: string[]): HandoffReport {
  return {
    goal: "Continue this branch",
    target: "generic",
    repository: {
      name: "demo",
      branch: "main",
      status: " M README.md",
      recentCommits: ["abc123 Release v0.6.0"],
      changedFiles,
      stagedDiffSummary: "",
      unstagedDiffSummary: "",
      includeDiff: false
    },
    instructionFiles: [],
    budget: { requestedTokens: 4000, estimatedTokens: 0, wasTrimmed: false }
  };
}
```

Run:

```bash
rtk pnpm test tests/unit/checkpoint.test.ts
```

Expected before implementation: fail because module does not exist.

- [ ] **Step 3: Implement `src/core/checkpoint.ts`**

Implementation responsibilities:

- `checkpointFilename(now: Date): string`
- `renderCheckpointMarkdown(report: HandoffReport, now: Date): string`
- `writeCheckpointFiles(root: string, outputDir: string, markdown: string, now: Date): Promise<{ checkpointPath: string; latestPath: string }>`

Rendering sections:

- Project
- Current State
- Important Files / Artifacts
- Verification
- Open Questions / Risks
- Next Steps
- Resume Prompt

Use `redactText` before writing files.

- [ ] **Step 4: Re-run unit tests**

Run:

```bash
rtk pnpm test tests/unit/checkpoint.test.ts
```

Expected: pass.

- [ ] **Step 5: Add CLI command**

Create `src/cli/commands/checkpoint.ts` following the existing `pack.ts` and `resume.ts` patterns.

Options:

```ts
.option("--goal <text>", "checkpoint goal", "Continue this project")
.option("--output-dir <path>", "checkpoint directory", "docs/checkpoints")
.option("--for <agent>", "target output: generic, codex, claude, or cursor", "generic")
.option("--budget <tokens>", "rough output token budget", parseBudget, 4000)
.option("--verify", "run safe verification scripts and include results")
```

Action:

- Find git root from `process.cwd()`.
- Collect a handoff report with `includeDiff: false`, `includeDiffSummary: true`, `includeVerification: options.verify`, `scanSecrets: false`, `includeCache: false`.
- Render checkpoint markdown.
- Write timestamped and latest files.
- Print both written paths to stderr.

- [ ] **Step 6: Register command**

Modify `src/cli/index.ts`:

```ts
import { createCheckpointCommand } from "./commands/checkpoint.js";
program.addCommand(createCheckpointCommand());
```

Place it after `resume` or before `cache`; keep command ordering logical.

- [ ] **Step 7: Write integration test**

Create `tests/integration/checkpoint-command.test.ts`.

Test:

- Temp git repo is initialized.
- `README.md` is written.
- `checkpoint save --goal "Integration checkpoint" --output-dir .hk-checkpoints` runs.
- `.hk-checkpoints/LATEST.md` exists.
- One timestamped `.md` file exists.
- Latest content contains goal and changed file.

Run:

```bash
rtk pnpm test tests/integration/checkpoint-command.test.ts
```

Expected: pass.

- [ ] **Step 8: Document command**

Update README usage:

```sh
handoffkit checkpoint save --goal "Continue this branch"
handoffkit resume docs/checkpoints/LATEST.md --goal "Continue from checkpoint"
```

Update ROADMAP:

- Move richer checkpoint automation from "Next Up" to implemented.

Update CHANGELOG:

```md
## 0.7.0

- Added `handoffkit checkpoint save` for explicit timestamped progress checkpoints under `docs/checkpoints`.
- Added `docs/checkpoints/LATEST.md` update support for quick resume workflows.
- Documented checkpoint-to-resume usage.
```

- [ ] **Step 9: Full verification**

Run:

```bash
rtk pnpm check
rtk pnpm pack:dry-run
pnpm dev checkpoint save --goal "Release smoke checkpoint" --output-dir .tmp-checkpoints
pnpm dev resume .tmp-checkpoints/LATEST.md --goal "Resume from checkpoint smoke"
git diff --check
```

Expected: all commands pass; smoke checkpoint files are generated only under `.tmp-checkpoints`.

- [ ] **Step 10: Commit**

Run:

```bash
git add src/core/checkpoint.ts src/cli/commands/checkpoint.ts src/cli/index.ts tests/unit/checkpoint.test.ts tests/integration/checkpoint-command.test.ts README.md ROADMAP.md CHANGELOG.md
git commit -m "feat: add checkpoint command"
```

Expected: commit links to the v0.7.0 product issue in PR body.

---

## Task 6: Release `v0.7.0`

**Files:**
- Modify: `package.json`
- Modify: `src/cli/index.ts`
- Modify: `CHANGELOG.md`
- Modify: `docs/RELEASE.md`

- [ ] **Step 1: Bump version**

Update:

- `package.json` version from `0.6.0` to `0.7.0`.
- `src/cli/index.ts` `.version("0.7.0")`.
- `CHANGELOG.md` has final `0.7.0` notes at the top.

- [ ] **Step 2: Release verification**

Run:

```bash
rtk pnpm check
rtk pnpm pack:dry-run
rtk npm --cache ./.npm-cache publish --dry-run --access public
rtk pnpm smoke:release
node dist/index.js --version
node dist/index.js checkpoint save --goal "Release checkpoint smoke" --output-dir .tmp-release-checkpoints
node dist/index.js resume .tmp-release-checkpoints/LATEST.md --goal "Release resume smoke"
git diff --check
```

Expected:

- `pnpm check` passes.
- Pack dry run reports `@kingkyylian/handoffkit@0.7.0`.
- npm dry run reports `+ @kingkyylian/handoffkit@0.7.0`.
- CLI version prints `0.7.0`.
- Checkpoint and resume smoke commands exit 0.

- [ ] **Step 3: Commit release prep**

Run:

```bash
git add package.json src/cli/index.ts CHANGELOG.md docs/RELEASE.md
git commit -m "release: prepare v0.7.0"
```

Expected: release prep commit ready on `main` or release branch.

- [ ] **Step 4: Tag, publish, and release**

Use the existing `docs/RELEASE.md` process. Required external confirmations:

- Git tag `v0.7.0` pushed.
- GitHub release created.
- GitHub Actions CI and Release workflows pass.
- npm `@kingkyylian/handoffkit@0.7.0` published.
- npm `latest` points to `0.7.0`.

- [ ] **Step 5: Save checkpoint**

Run:

```bash
pnpm dev checkpoint save --goal "Post-release v0.7.0 checkpoint"
```

Expected: `docs/checkpoints/LATEST.md` captures release state for future sessions.

---

## Task 7: Distribution After Release

**Files:**
- No source changes required unless the README needs a post-release badge/example refresh.

- [ ] **Step 1: Prepare a short launch note**

Use this exact structure:

```md
HandoffKit v0.7.0 is out.

It creates local-first handoff and checkpoint packets for interrupted AI coding sessions, without LLM API calls or telemetry.

New: `handoffkit checkpoint save` writes timestamped progress files plus `docs/checkpoints/LATEST.md`, so another agent can resume from a durable checkpoint.

Try:
pnpm dlx @kingkyylian/handoffkit checkpoint save --goal "Continue this branch"
pnpm dlx @kingkyylian/handoffkit resume docs/checkpoints/LATEST.md --goal "Resume from checkpoint"

GitHub: https://github.com/kingkyylian/handoffkit
NPM: https://www.npmjs.com/package/@kingkyylian/handoffkit
```

- [ ] **Step 2: Share in focused places**

Targets:

- GitHub release notes.
- npm README update is automatic through package publish.
- Personal/dev social post.
- One relevant AI coding/CLI community thread, only where self-promotion is allowed.

- [ ] **Step 3: Measure after 48 hours**

Run:

```bash
rtk gh api repos/kingkyylian/handoffkit
rtk gh api repos/kingkyylian/handoffkit/traffic/views
rtk gh api repos/kingkyylian/handoffkit/traffic/clones
rtk npm view @kingkyylian/handoffkit version dist-tags --json
```

Record:

- stars
- unique views
- unique clones
- npm latest version
- any issues opened

Expected: no guaranteed star target. The real acceptance criterion is that the project has a clearer first impression, one stronger product hook, and measurable post-release traffic.

---

## Execution Order

1. Task 1: create issues.
2. Task 2: merge Dependabot PR.
3. Task 3: normalize repo intake and agent guidance.
4. Task 4: improve README and examples.
5. Task 5: implement checkpoint command.
6. Task 6: release `v0.7.0`.
7. Task 7: distribute and measure.

## Stop Conditions

- Stop before publishing if `pnpm check`, `pnpm pack:dry-run`, npm dry-run, or release smoke fails.
- Stop before merging if Dependabot PR checks are not green.
- Stop before adding generated files if they are local caches, build output, coverage output, databases, or temporary checkpoint smoke files.
- Stop and reassess if implementing checkpoint requires implicit writes outside the explicit command path.

## Self-Review

- The plan covers repo hygiene, conversion, product value, release, and post-release measurement.
- There are no placeholder tasks; each task has exact paths, commands, and expected outcomes.
- Product implementation follows existing command patterns in `src/cli/commands`, core deterministic logic in `src/core`, and Vitest coverage under `tests/unit` and `tests/integration`.
- The checkpoint feature preserves the project’s local-first contract: no LLM API calls, no telemetry, no implicit git writes.
