import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Command } from "commander";
import { execa } from "execa";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createPackCommand } from "../../src/cli/commands/pack.js";

describe("pack command", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
  });

  it("prints JSON for a git repo and honors --no-diff", async () => {
    const root = await makeRepo();
    await writeFile(join(root, "README.md"), "# Demo\n");
    process.chdir(root);

    let stdout = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      stdout += chunk.toString();
      return true;
    });

    const program = new Command().exitOverride().addCommand(createPackCommand());
    await program.parseAsync(["node", "test", "pack", "--goal", "Integration smoke", "--format", "json", "--no-diff"]);

    const parsed = JSON.parse(stdout);
    expect(parsed.goal).toBe("Integration smoke");
    expect(parsed.repository.changedFiles).toContain("README.md");
    expect(parsed.repository.unstagedDiffSummary).toBe("");
    expect(parsed.repository.diff).toBeUndefined();
  });
});

async function makeRepo() {
  const root = await mkdtemp(join(tmpdir(), "handoffkit-"));
  await execa("git", ["init", "--initial-branch=main"], { cwd: root });
  return root;
}
