import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Command } from "commander";
import { execa } from "execa";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createCheckpointCommand } from "../../src/cli/commands/checkpoint.js";

describe("checkpoint command", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
  });

  it("writes timestamped and latest checkpoint files for a git repo", async () => {
    const root = await makeRepo();
    await writeFile(join(root, "README.md"), "# Demo\n");
    process.chdir(root);

    vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const program = new Command().exitOverride().addCommand(createCheckpointCommand());
    await program.parseAsync([
      "node",
      "test",
      "checkpoint",
      "save",
      "--goal",
      "Integration checkpoint OPENAI_API_KEY=sk-test1234567890abcdef",
      "--output-dir",
      ".hk-checkpoints"
    ]);

    const entries = await readdir(join(root, ".hk-checkpoints"));
    const timestamped = entries.filter((entry) => /^\d{4}-\d{2}-\d{2}-\d{4}\.md$/.test(entry));
    const latest = await readFile(join(root, ".hk-checkpoints", "LATEST.md"), "utf8");

    expect(timestamped).toHaveLength(1);
    expect(latest).toContain("Integration checkpoint");
    expect(latest).toContain("OPENAI_API_KEY=[REDACTED]");
    expect(latest).not.toContain("sk-test1234567890abcdef");
    expect(latest).toContain("- `README.md`");
    expect(latest).toContain("handoffkit resume .hk-checkpoints/LATEST.md");
  });
});

async function makeRepo() {
  const root = await mkdtemp(join(tmpdir(), "handoffkit-"));
  await execa("git", ["init", "--initial-branch=main"], { cwd: root });
  return root;
}
