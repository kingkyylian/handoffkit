import { lstat, open } from "node:fs/promises";
import { basename, join } from "node:path";

import { execa } from "execa";

import { HandoffKitCliError } from "../cli/errors.js";
import type { DiffInfo, RepositoryInfo } from "../types.js";

const UNTRACKED_PATCH_CHAR_LIMIT = 20_000;
const IGNORED_CHANGED_PATH_PREFIXES = ["node_modules/", "dist/", "coverage/", ".git/", ".handoffkit/"];

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
  const patches = await Promise.all(files.map((file) => untrackedFilePreview(root, file)));

  return patches.join("\n\n");
}

async function untrackedFilePreview(root: string, file: string) {
  const path = join(root, file);

  try {
    const stats = await lstat(path);

    if (stats.isSymbolicLink()) {
      return untrackedPreviewBlock(file, "Symlink target not previewed.");
    }

    if (!stats.isFile()) {
      return untrackedPreviewBlock(file, "Non-regular file not previewed.");
    }

    const handle = await open(path, "r");
    try {
      const readLength = Math.min(stats.size, UNTRACKED_PATCH_CHAR_LIMIT + 1);
      const buffer = Buffer.alloc(readLength);
      const { bytesRead } = await handle.read(buffer, 0, readLength, 0);
      const chunk = buffer.subarray(0, bytesRead);

      if (isLikelyBinary(chunk)) {
        return untrackedPreviewBlock(file, "Binary or non-text file not previewed.");
      }

      const preview = chunk.subarray(0, UNTRACKED_PATCH_CHAR_LIMIT).toString("utf8").trimEnd();
      const truncated = stats.size > UNTRACKED_PATCH_CHAR_LIMIT || bytesRead > UNTRACKED_PATCH_CHAR_LIMIT;
      return untrackedPreviewBlock(file, truncated ? `${preview}\n[truncated]` : preview);
    } finally {
      await handle.close();
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return untrackedPreviewBlock(file, `Could not preview untracked file${code ? ` (${code})` : ""}.`);
  }
}

function untrackedPreviewBlock(file: string, content: string) {
  return [`Untracked file: ${file}`, "```text", content, "```"].join("\n");
}

function isLikelyBinary(buffer: Buffer) {
  if (buffer.includes(0)) {
    return true;
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  if (sample.length === 0) {
    return false;
  }

  let controlBytes = 0;
  for (const byte of sample) {
    if (byte < 7 || (byte > 14 && byte < 32)) {
      controlBytes += 1;
    }
  }

  return controlBytes / sample.length > 0.3;
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
