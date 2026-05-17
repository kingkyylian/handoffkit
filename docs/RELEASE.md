# Release Checklist

HandoffKit releases are intentionally manual. A release should prove that the source tree, npm tarball, installed binary, and registry publish path all work before a tag is created.

## Prerequisites

- npm account access for `@kingkyylian/handoffkit`
- GitHub repository access for `kingkyylian/handoffkit`
- Node.js 22 or newer
- pnpm via Corepack

For GitHub Actions publishing, add an `NPM_TOKEN` repository secret with publish access. Without that secret, the `Release` workflow can run verification but cannot publish.

## Before Tagging

Run from a clean `main` checkout:

```sh
pnpm install
pnpm check
pnpm pack:dry-run
npm --cache ./.npm-cache publish --dry-run --access public
```

Create a real tarball and install it into a clean temporary repository:

```sh
mkdir -p /private/tmp/handoffkit-release-smoke
npm --cache ./.npm-cache pack --pack-destination /private/tmp/handoffkit-release-smoke

SMOKE_DIR="$(mktemp -d /private/tmp/handoffkit-install-smoke.XXXXXX)"
cd "$SMOKE_DIR"
git init --initial-branch=main
printf '# Smoke\n' > README.md
npm init -y
npm --cache /private/tmp/handoffkit-npm-cache install /private/tmp/handoffkit-release-smoke/kingkyylian-handoffkit-0.1.0.tgz
./node_modules/.bin/handoffkit pack --goal "Smoke release" --format json --no-diff
./node_modules/.bin/handoffkit risk --format json
./node_modules/.bin/handoffkit scan-secrets --format json
./node_modules/.bin/handoffkit resume README.md --goal "Resume smoke" --format json
```

Confirm that `node_modules`, `dist`, and `coverage` do not appear in `changedFiles` just because the package was installed or built.

## Tag and Release

After CI passes on `main`:

```sh
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --repo kingkyylian/handoffkit --title "HandoffKit v0.1.0" --notes-file /private/tmp/handoffkit-v0.1.0-release-notes.md
```

Preferred publish path:

```sh
gh workflow run Release --repo kingkyylian/handoffkit --ref v0.1.0
```

Fallback local publish path when `NPM_TOKEN` is not configured:

```sh
npm --cache ./.npm-cache publish --provenance --access public
```

## After Publishing

```sh
npm view @kingkyylian/handoffkit version
pnpm dlx @kingkyylian/handoffkit pack --goal "Registry smoke" --format json --no-diff
```

The published version should match the tag, and the registry smoke command should exit successfully inside a git repository.
