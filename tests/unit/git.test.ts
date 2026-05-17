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

  it("preserves leading dots for modified hidden files", async () => {
    const root = await makeTempDir();
    await execa("git", ["init", "--initial-branch=main"], { cwd: root });
    await writeFile(join(root, ".gitignore"), "dist\n");
    await execa("git", ["add", ".gitignore"], { cwd: root });
    await execa("git", ["commit", "-m", "Add gitignore"], {
      cwd: root,
      env: {
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@example.com",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@example.com"
      }
    });
    await writeFile(join(root, ".gitignore"), "dist\n.npm-cache\n");

    const info = await collectGitInfo(root, { includeDiff: false, includeDiffSummary: false });

    expect(info.changedFiles).toContain(".gitignore");
    expect(info.changedFiles).not.toContain("gitignore");
  });

  it("can focus recent commits and diff summary on a base ref", async () => {
    const root = await makeTempDir();
    await execa("git", ["init", "--initial-branch=main"], { cwd: root });
    await writeFile(join(root, "README.md"), "# Demo\n");
    await execa("git", ["add", "README.md"], { cwd: root });
    await commit(root, "Initial commit");
    await execa("git", ["checkout", "-b", "feature/handoff"], { cwd: root });
    await writeFile(join(root, "src.ts"), "export const value = 1;\n");
    await execa("git", ["add", "src.ts"], { cwd: root });
    await commit(root, "Add feature file");

    const info = await collectGitInfo(root, { includeDiff: true, includeDiffSummary: true, since: "main" });

    expect(info.baseRef).toBe("main");
    expect(info.recentCommits).toEqual([expect.stringContaining("Add feature file")]);
    expect(info.changedFiles).toContain("src.ts");
    expect(info.baseDiffSummary).toContain("src.ts");
    expect(info.baseDiff).toContain("export const value = 1");
  });
});

async function makeTempDir() {
  return mkdtemp(join(tmpdir(), "handoffkit-"));
}

async function commit(root: string, message: string) {
  await execa("git", ["commit", "-m", message], {
    cwd: root,
    env: {
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com"
    }
  });
}
