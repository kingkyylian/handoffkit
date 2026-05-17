# HandoffKit v0.1.0 Release Readiness Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. In Codex, use `executing-plans` inline unless the user explicitly asks for subagents or parallel agent work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare HandoffKit v0.1.0 for a professional first release by validating packaging, install behavior, CLI smoke paths, release workflow assumptions, and GitHub/npm readiness.

**Architecture:** This is a release-readiness pass, not a feature pass. It should keep runtime code stable unless verification exposes a release blocker. Validation happens through local package tarball installation, dry-run publish checks, GitHub Actions checks, and documentation updates if a gap is found.

**Tech Stack:** Node.js 22, TypeScript ESM, pnpm, npm package publishing, GitHub Actions, GitHub CLI.

---

### Task 1: Audit Current Release State

**Files:**
- Read: `package.json`
- Read: `README.md`
- Read: `.github/workflows/release.yml`
- Read: `CHANGELOG.md`
- Read: `SECURITY.md`
- Read: `CONTRIBUTING.md`

- [ ] **Step 1: Confirm git and npm state**

Run:

```sh
rtk git status --short --branch
rtk npm whoami
rtk npm view @kingkyylian/handoffkit version
```

Expected:
- Git branch is clean and tracking `origin/main`.
- npm auth returns `kingkyylian`.
- `npm view` either returns no package yet or a version lower than `0.1.0`.

- [ ] **Step 2: Confirm release workflow secret status**

Run:

```sh
rtk gh api repos/kingkyylian/handoffkit/actions/secrets --jq '.secrets[].name'
```

Expected:
- `NPM_TOKEN` exists if release workflow publishing will be used.
- If `NPM_TOKEN` is missing, use local npm publish or stop before workflow publish.

### Task 2: Validate Package Contents

**Files:**
- Read: `package.json`
- Generated only in temp dirs under `/private/tmp`

- [ ] **Step 1: Build and dry-run package**

Run:

```sh
rtk pnpm check
rtk pnpm pack:dry-run
```

Expected:
- Typecheck, lint, tests, and build pass.
- Dry-run tarball includes `dist/index.js`, `dist/index.d.ts`, README, license, changelog, roadmap, security docs, contribution docs, and package metadata.

- [ ] **Step 2: Create a real tarball in `/private/tmp`**

Run:

```sh
npm --cache ./.npm-cache pack --pack-destination /private/tmp/handoffkit-release-smoke
```

Expected:
- A tarball named like `kingkyylian-handoffkit-0.1.0.tgz` is created in `/private/tmp/handoffkit-release-smoke`.

### Task 3: Validate Installed Binary

**Files:**
- Generated only in temp dirs under `/private/tmp`

- [ ] **Step 1: Install package tarball in a clean smoke repo**

Run:

```sh
mkdir -p /private/tmp/handoffkit-install-smoke
cd /private/tmp/handoffkit-install-smoke
git init --initial-branch=main
printf '# Smoke\n' > README.md
npm init -y
npm --cache /private/tmp/handoffkit-npm-cache install /private/tmp/handoffkit-release-smoke/kingkyylian-handoffkit-0.1.0.tgz
```

Expected:
- Install succeeds.
- `node_modules/.bin/handoffkit` exists and is executable.

- [ ] **Step 2: Run installed CLI smoke commands**

Run:

```sh
./node_modules/.bin/handoffkit pack --goal "Smoke release" --format json --no-diff
./node_modules/.bin/handoffkit risk --format json
./node_modules/.bin/handoffkit scan-secrets --format json
./node_modules/.bin/handoffkit resume README.md --goal "Resume smoke" --format json
```

Expected:
- Commands exit 0.
- JSON output is valid.
- `scan-secrets` does not fail when scanner binaries are missing.

### Task 4: Validate Publish Dry Run

**Files:**
- Read: `package.json`

- [ ] **Step 1: Run npm publish dry-run**

Run:

```sh
npm --cache ./.npm-cache publish --dry-run --access public
```

Expected:
- Dry-run succeeds.
- Package metadata shows `@kingkyylian/handoffkit@0.1.0`.
- No unexpected files are included.

### Task 5: Update Release Docs if Needed

**Files:**
- Modify if gaps are found: `README.md`
- Modify if gaps are found: `CHANGELOG.md`
- Modify if gaps are found: `.github/workflows/release.yml`

- [ ] **Step 1: Patch only release blockers**

If verification exposes a blocker, patch the smallest relevant file. Examples:

```json
{
  "scripts": {
    "pack:dry-run": "npm --cache ./.npm-cache pack --dry-run"
  }
}
```

Expected:
- No runtime feature work.
- Only release-facing fixes.

### Task 6: Tag and Release Preparation

**Files:**
- Git tag: `v0.1.0`
- GitHub release: `v0.1.0`

- [ ] **Step 1: Commit any release-readiness fixes**

Run:

```sh
rtk git status --short --branch
rtk git add <changed-files>
rtk git commit -m "Prepare v0.1.0 release"
rtk git push
```

Expected:
- Working tree clean.
- CI passes on the pushed commit.

- [ ] **Step 2: Create tag after CI passes**

Run:

```sh
rtk git tag v0.1.0
rtk git push origin v0.1.0
```

Expected:
- Tag exists locally and remotely.

- [ ] **Step 3: Create GitHub release**

Run:

```sh
rtk gh release create v0.1.0 --repo kingkyylian/handoffkit --title "HandoffKit v0.1.0" --notes-file /private/tmp/handoffkit-v0.1.0-release-notes.md
```

Expected:
- GitHub release exists.
- Notes summarize first release capabilities and safety model.

### Task 7: Publish Decision

**Files:**
- No file changes expected.

- [ ] **Step 1: Choose publishing path**

If `NPM_TOKEN` exists:

```sh
rtk gh workflow run Release --repo kingkyylian/handoffkit --ref v0.1.0
rtk gh run watch <run-id> --repo kingkyylian/handoffkit --exit-status
```

If `NPM_TOKEN` does not exist but local npm auth is valid:

```sh
npm --cache ./.npm-cache publish --provenance --access public
```

Expected:
- Package publishes as `@kingkyylian/handoffkit@0.1.0`.
- Post-publish smoke works with `pnpm dlx`.

### Task 8: Post-Release Smoke

**Files:**
- No repo file changes expected.

- [ ] **Step 1: Verify npm package availability**

Run:

```sh
rtk npm view @kingkyylian/handoffkit version
```

Expected:
- Output is `0.1.0`.

- [ ] **Step 2: Verify package can run from registry**

Run:

```sh
pnpm dlx @kingkyylian/handoffkit pack --goal "Registry smoke" --format json --no-diff
```

Expected:
- Command exits 0 inside a git repo.
- Output is valid JSON.

---

## Self-Review Checklist

- [ ] No runtime feature expansion during release readiness.
- [ ] Package tarball install smoke proves the binary path works.
- [ ] Publish dry-run proves package contents.
- [ ] CI passes before tagging.
- [ ] Actual publish is only attempted after auth and release path are clear.
