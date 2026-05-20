# Release Checklist

HandoffKit releases are intentionally manual. A release should prove that the source tree, npm tarball, installed binary, and registry publish path all work before a tag is created.

## Prerequisites

- npm account access for `@kingkyylian/handoffkit`
- GitHub repository access for `kingkyylian/handoffkit`
- Node.js 22 or newer
- pnpm via Corepack

For GitHub Actions publishing, add an `NPM_TOKEN` repository secret with publish access. The token must be usable from CI without an interactive one-time password; for npm accounts with publish 2FA, use a granular token with package write access and 2FA bypass enabled, or configure npm trusted publishing. Without a valid publish token, the `Release` workflow can run verification but cannot publish.

## Before Tagging

Run from a clean `main` checkout:

```sh
pnpm install
pnpm check
pnpm pack:dry-run
npm --cache ./.npm-cache publish --dry-run --access public
```

Run the packaged install smoke:

```sh
pnpm smoke:release
```

The script packs the current package, installs it into a clean temporary git repository, runs `pack`, `risk`, `scan-secrets`, and `resume`, and fails if generated directories such as `node_modules`, `dist`, or `coverage` appear in `changedFiles`.

## Tag and Release

After CI passes on `main`:

```sh
version=0.2.0
git tag "v${version}"
git push origin "v${version}"
gh release create "v${version}" --repo kingkyylian/handoffkit --title "HandoffKit v${version}" --notes-file "/private/tmp/handoffkit-v${version}-release-notes.md"
```

Preferred publish path:

```sh
gh workflow run Release --repo kingkyylian/handoffkit --ref "v${version}"
```

Fallback local publish path when `NPM_TOKEN` is not configured:

```sh
npm --cache ./.npm-cache publish --provenance --access public
```

## After Publishing

```sh
npm view "@kingkyylian/handoffkit@${version}" version --registry=https://registry.npmjs.org/
pnpm dlx "@kingkyylian/handoffkit@${version}" pack --goal "Registry smoke" --format json --no-diff
```

The published version should match the tag, and the registry smoke command should exit successfully inside a git repository.
