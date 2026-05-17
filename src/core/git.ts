import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { execa } from "execa";

import type { DiffInfo, RepositoryInfo } from "../types.js";

const UNTRACKED_PATCH_CHAR_LIMIT = 20_000;

export interface GitCollectOptions {
  includeDiff: boolean;
  includeDiffSummary: boolean;
}

export async function findGitRoot(cwd: string): Promise<string> {
  const result = await execa("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    reject: false
  });

  if (result.exitCode !== 0) {
    throw new Error("HandoffKit must be run inside a git repository.");
  }

  return result.stdout.trim();
}

export async function collectGitInfo(root: string, options: GitCollectOptions): Promise<RepositoryInfo> {
  const [branch, status, porcelainStatus, recentCommits, stagedDiffSummary, trackedUnstagedDiffSummary] =
    await Promise.all([
      currentBranch(root),
      git(root, ["status", "--short", "--branch"]),
      git(root, ["status", "--porcelain=v1", "--untracked-files=all"]),
      recentCommitLines(root),
      options.includeDiffSummary ? git(root, ["diff", "--cached", "--stat"]) : Promise.resolve(""),
      options.includeDiffSummary ? git(root, ["diff", "--stat"]) : Promise.resolve("")
    ]);

  const changedFiles = parseChangedFiles(porcelainStatus);
  const untrackedFiles = parseUntrackedFiles(porcelainStatus);
  const unstagedDiffSummary = options.includeDiffSummary
    ? joinSections([trackedUnstagedDiffSummary, renderUntrackedSummary(untrackedFiles)])
    : "";
  const diff = options.includeDiff ? await collectDiff(root, untrackedFiles) : undefined;

  return {
    name: basename(root),
    branch,
    status,
    recentCommits,
    changedFiles,
    stagedDiffSummary,
    unstagedDiffSummary,
    includeDiff: options.includeDiff,
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

async function recentCommitLines(root: string) {
  const output = await git(root, ["log", "--oneline", "-n", "10"], { allowFailure: true });
  return output ? output.split("\n") : [];
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
    .map((line) => line.slice(3).trim())
    .map((path) => (path.includes(" -> ") ? path.split(" -> ").at(-1) ?? path : path))
    .map((path) => path.replace(/^"|"$/g, ""));

  return [...new Set(files)].sort();
}

function parseUntrackedFiles(status: string) {
  return status
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("?? "))
    .map((line) => line.slice(3).trim())
    .map((path) => path.replace(/^"|"$/g, ""))
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
