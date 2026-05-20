import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Command } from "commander";
import { execa } from "execa";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createResumeCommand } from "../../src/cli/commands/resume.js";
import { createVerifyCommand } from "../../src/cli/commands/verify.js";

describe("cache artifacts", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
  });

  it("writes verification artifacts only when verify --cache is explicit", async () => {
    const root = await makeRepo();
    process.chdir(root);
    captureOutput();

    const program = new Command().exitOverride().addCommand(createVerifyCommand());
    await program.parseAsync(["node", "test", "verify", "--format", "json", "--cache"]);

    const latest = JSON.parse(await readFile(join(root, ".handoffkit", "verification", "latest.json"), "utf8"));
    const entries = await readdir(join(root, ".handoffkit", "verification"));

    expect(entries).toContain("latest.json");
    expect(entries.some((entry) => entry !== "latest.json" && entry.endsWith(".json"))).toBe(true);
    expect(latest).toMatchObject({
      version: 1,
      kind: "verification",
      data: { commands: [] }
    });
  });

  it("writes resume artifacts only when resume --cache is explicit", async () => {
    const root = await makeRepo();
    const transcriptPath = join(root, "previous.txt");
    await writeFile(transcriptPath, ["assistant: Done: Added cache docs", "assistant: Next steps: Run CI"].join("\n"), "utf8");
    process.chdir(root);
    captureOutput();

    const program = new Command().exitOverride().addCommand(createResumeCommand());
    await program.parseAsync(["node", "test", "resume", transcriptPath, "--goal", "Resume cache smoke", "--format", "json", "--cache"]);

    const latest = JSON.parse(await readFile(join(root, ".handoffkit", "resume", "latest.json"), "utf8"));
    const entries = await readdir(join(root, ".handoffkit", "resume"));

    expect(entries).toContain("latest.json");
    expect(entries.some((entry) => entry !== "latest.json" && entry.endsWith(".json"))).toBe(true);
    expect(latest).toMatchObject({
      version: 1,
      kind: "resume",
      data: {
        goal: "Resume cache smoke",
        source: {
          path: transcriptPath,
          state: {
            completed: [{ text: "Added cache docs", sourceHeading: "Done" }],
            remaining: [{ text: "Run CI", sourceHeading: "Next steps" }],
            nextSafestAction: "Run CI"
          }
        }
      }
    });
  });
});

async function makeRepo() {
  const root = await mkdtemp(join(tmpdir(), "handoffkit-cache-"));
  await execa("git", ["init", "--initial-branch=main"], { cwd: root });
  await writeFile(join(root, "README.md"), "# Demo\n", "utf8");
  return root;
}

function captureOutput() {
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
}
