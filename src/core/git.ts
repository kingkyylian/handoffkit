import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { execa } from "execa";

import { HandoffKitCliError } from "../cli/errors.js";
import type { DiffInfo, RepositoryInfo } from "../types.js";

const UNTRACKED_PATCH_CHAR_LIMIT = 20_000;
const IGNORED_CHANGED_PATH_PREFIXES = ["node_modules/", "dist/", "coverage/", ".git/"];

export interface GitCollectOptions {
  includeDiff: boolean;
  includeDiffSummary: boolean;
  since?: string;
}

export async function findGitRoot(cwd: string): Promise<string> {
  const result = await execa("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    reject: false
  });

  if (result.exitCode !== 0) {
    throw new HandoffKitCliError([
      "HandoffKit must be run inside a git repository.",
      "Run this command from a git checkout, or initialize one with `git init`."
    ].join("\n"));
  }

  return result.stdout.trimEnd();
}

export async function collectGitInfo(root: string, options: GitCollectOptions): Promise<RepositoryInfo> {
  const [branch, status, porcelainStatus, recentCommits, stagedDiffSummary, trackedUnstagedDiffSummary, baseInfo] =
    await Promise.all([
      currentBranch(root),
      git(root, ["status", "--short", "--branch"]),
      git(root, ["status", "--porcelain=v1", "--untracked-files=all"]),
      recentCommitLines(root, options.since),
      options.includeDiffSummary ? git(root, ["diff", "--cached", "--stat"]) : Promise.resolve(""),
      options.includeDiffSummary ? git(root, ["diff", "--stat"]) : Promise.resolve(""),
      options.since ? collectBaseInfo(root, options.since, options.includeDiffSummary, options.includeDiff) : Promise.resolve(undefined)
    ]);

  const changedFiles = uniqueSorted([...(baseInfo?.changedFiles ?? []), ...parseChangedFiles(porcelainStatus)]);
  const untrackedFiles = parseUntrackedFiles(porcelainStatus);
  const unstagedDiffSummary = options.includeDiffSummary
    ? joinSections([trackedUnstagedDiffSummary, renderUntrackedSummary(untrackedFiles)])
    : "";
  const diff = options.includeDiff ? await collectDiff(root, untrackedFiles) : undefined;

  return {
    name: basename(root),
    branch,
    ...(options.since ? { baseRef: options.since } : {}),
    status,
    recentCommits,
    changedFiles,
    ...(baseInfo?.summary ? { baseDiffSummary: baseInfo.summary } : {}),
    stagedDiffSummary,
    unstagedDiffSummary,
    includeDiff: options.includeDiff,
    ...(baseInfo?.patch ? { baseDiff: baseInfo.patch } : {}),
    ...(diff ? { diff } : {})
  };
}

async function currentBranch(root: string) {
  const branch = await git(root, ["branch", "--show-current"]);

  if (branch) {
    return branch;
  }

  const commit = await git(root, ["rev-parse", "--short", "HEAD"], { allowFailure: true });
  return commit ? `detached:${commit}` : "unknown";
}

async function recentCommitLines(root: string, since?: string) {
  const args = since ? ["log", "--oneline", "-n", "10", `${since}..HEAD`] : ["log", "--oneline", "-n", "10"];
  const output = await git(root, args, { allowFailure: true });
  return output ? output.split("\n") : [];
}

async function collectBaseInfo(root: string, since: string, includeDiffSummary: boolean, includeDiff: boolean) {
  await ensureRef(root, since);
  const range = `${since}...HEAD`;
  const [changedFiles, summary, patch] = await Promise.all([
    git(root, ["diff", "--name-only", range], { allowFailure: true }),
    includeDiffSummary ? git(root, ["diff", "--stat", range], { allowFailure: true }) : Promise.resolve(""),
    includeDiff ? git(root, ["diff", "--patch", range], { allowFailure: true }) : Promise.resolve("")
  ]);

  return {
    changedFiles: changedFiles ? changedFiles.split("\n").filter(Boolean) : [],
    summary,
    patch
  };
}

async function ensureRef(root: string, ref: string) {
  const result = await execa("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
    cwd: root,
    reject: false
  });

  if (result.exitCode !== 0) {
    throw new Error(`Could not resolve --since ref: ${ref}`);
  }
}

async function collectDiff(root: string, untrackedFiles: string[]): Promise<DiffInfo> {
  const [staged, unstagedTracked, untracked] = await Promise.all([
    git(root, ["diff", "--cached", "--patch"]),
    git(root, ["diff", "--patch"]),
    untrackedPatch(root, untrackedFiles)
  ]);

  return { staged, unstaged: joinSections([unstagedTracked, untracked]) };
}

async function git(root: string, args: string[], options: { allowFailure?: boolean } = {}) {
  const result = await execa("git", args, {
    cwd: root,
    reject: false
  });

  if (result.exitCode !== 0 && !options.allowFailure) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
}

function parseChangedFiles(status: string) {
  const files = status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(line[2] === " " ? 3 : 2).trim())
    .map((path) => (path.includes(" -> ") ? path.split(" -> ").at(-1) ?? path : path))
    .map((path) => path.replace(/^"|"$/g, ""));

  return uniqueSorted(files.filter((file) => !isIgnoredChangedPath(file)));
}

function parseUntrackedFiles(status: string) {
  return status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("?? "))
    .map((line) => line.slice(3).trim())
    .map((path) => path.replace(/^"|"$/g, ""))
    .filter((file) => !isIgnoredChangedPath(file))
    .sort();
}

function renderUntrackedSummary(files: string[]) {
  if (files.length === 0) {
    return "";
  }

  return files.map((file) => `${file} | untracked`).join("\n");
}

async function untrackedPatch(root: string, files: string[]) {
  const patches = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(`${root}/${file}`, "utf8");
      const trimmedContent =
        content.length > UNTRACKED_PATCH_CHAR_LIMIT
          ? `${content.slice(0, UNTRACKED_PATCH_CHAR_LIMIT).trimEnd()}\n[truncated]`
          : content.trimEnd();

      return [`Untracked file: ${file}`, "```text", trimmedContent, "```"].join("\n");
    })
  );

  return patches.join("\n\n");
}

function joinSections(sections: string[]) {
  return sections.filter(Boolean).join("\n\n").trim();
}

function uniqueSorted(files: string[]) {
  return [...new Set(files.filter((file) => !isIgnoredChangedPath(file)))].sort();
}

function isIgnoredChangedPath(file: string) {
  return IGNORED_CHANGED_PATH_PREFIXES.some((prefix) => file === prefix.slice(0, -1) || file.startsWith(prefix));
}
