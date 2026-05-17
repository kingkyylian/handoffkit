import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { execa } from "execa";
import { describe, expect, it } from "vitest";

import { collectGitInfo } from "../../src/core/git.js";

describe("collectGitInfo", () => {
  it("detects branch, status, and changed files in a git repository", async () => {
    const root = await makeTempDir();
    await execa("git", ["init", "--initial-branch=main"], { cwd: root });
    await writeFile(join(root, "README.md"), "# Demo\n");

    const info = await collectGitInfo(root, { includeDiff: false, includeDiffSummary: true });

    expect(info.name).toBe(basename(root));
    expect(info.branch).toBe("main");
    expect(info.status).toContain("README.md");
    expect(info.changedFiles).toEqual(["README.md"]);
    expect(info.includeDiff).toBe(false);
  });

  it("summarizes and includes untracked file contents without claiming there is no unstaged diff", async () => {
    const root = await makeTempDir();
    await execa("git", ["init", "--initial-branch=main"], { cwd: root });
    await writeFile(join(root, "README.md"), "# Demo\n");

    const info = await collectGitInfo(root, { includeDiff: true, includeDiffSummary: true });

    expect(info.unstagedDiffSummary).toContain("README.md");
    expect(info.unstagedDiffSummary).toContain("untracked");
    expect(info.diff?.unstaged).toContain("Untracked file: README.md");
    expect(info.diff?.unstaged).toContain("# Demo");
  });
});

async function makeTempDir() {
  return mkdtemp(join(tmpdir(), "handoffkit-"));
}
