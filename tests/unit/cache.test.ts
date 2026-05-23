import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Command } from "commander";
import { execa } from "execa";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createCacheCommand } from "../../src/cli/commands/cache.js";
import { createPackCommand } from "../../src/cli/commands/pack.js";
import { createResumeCommand } from "../../src/cli/commands/resume.js";
import { createVerifyCommand } from "../../src/cli/commands/verify.js";
import { writeCacheArtifact } from "../../src/core/cache.js";

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

  it("lists and shows local cache artifacts", async () => {
    const root = await makeRepo();
    process.chdir(root);
    await writeCacheArtifact(
      root,
      "resume",
      { goal: "Resume cached work", source: { path: "previous.txt", preview: "Done: cache list" } },
      { now: new Date("2026-05-20T10:00:00.000Z") }
    );
    await writeCacheArtifact(root, "verification", { commands: [] }, { now: new Date("2026-05-20T10:05:00.000Z") });

    const listOutput = captureOutput();
    await new Command().exitOverride().addCommand(createCacheCommand()).parseAsync(["node", "test", "cache", "list", "--format", "json"]);
    const list = JSON.parse(listOutput.stdout());

    expect(list.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "resume", name: "latest", createdAt: "2026-05-20T10:00:00.000Z" }),
        expect.objectContaining({ kind: "verification", name: "latest", createdAt: "2026-05-20T10:05:00.000Z" })
      ])
    );
    expect(list.artifacts.find((artifact: { kind: string; name: string }) => artifact.kind === "resume" && artifact.name === "latest").path).toContain(
      ".handoffkit/resume/latest.json"
    );

    const showOutput = captureOutput();
    await new Command()
      .exitOverride()
      .addCommand(createCacheCommand())
      .parseAsync(["node", "test", "cache", "show", "resume", "latest", "--format", "json"]);
    const shown = JSON.parse(showOutput.stdout());

    expect(shown).toMatchObject({
      version: 1,
      kind: "resume",
      createdAt: "2026-05-20T10:00:00.000Z",
      data: { goal: "Resume cached work" }
    });
  });

  it("exports a local cache artifact as portable JSON", async () => {
    const root = await makeRepo();
    const outputPath = join(root, "resume-cache.json");
    process.chdir(root);
    await writeCacheArtifact(
      root,
      "resume",
      { goal: "Export cached work", source: { path: "previous.txt", preview: "Done: export cache" } },
      { now: new Date("2026-05-20T13:00:00.000Z") }
    );
    captureOutput();

    await new Command()
      .exitOverride()
      .addCommand(createCacheCommand())
      .parseAsync(["node", "test", "cache", "export", "resume", "latest", "--output", outputPath]);
    const exported = JSON.parse(await readFile(outputPath, "utf8"));

    expect(exported).toMatchObject({
      version: 1,
      kind: "resume",
      createdAt: "2026-05-20T13:00:00.000Z",
      data: { goal: "Export cached work" }
    });
  });

  it("imports a portable cache artifact into the current repository cache", async () => {
    const sourceRoot = await makeRepo();
    const targetRoot = await makeRepo();
    const importPath = join(sourceRoot, "verification-cache.json");
    await writeFile(
      importPath,
      `${JSON.stringify(
        {
          version: 1,
          kind: "verification",
          createdAt: "2026-05-20T13:05:00.000Z",
          data: { commands: [{ name: "test", command: "pnpm test", exitCode: 0, durationMs: 12, output: "ok" }] }
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    process.chdir(targetRoot);
    captureOutput();

    await new Command().exitOverride().addCommand(createCacheCommand()).parseAsync(["node", "test", "cache", "import", importPath]);

    const latest = JSON.parse(await readFile(join(targetRoot, ".handoffkit", "verification", "latest.json"), "utf8"));
    const snapshot = JSON.parse(await readFile(join(targetRoot, ".handoffkit", "verification", "2026-05-20T13-05-00-000Z.json"), "utf8"));

    expect(latest).toMatchObject({
      version: 1,
      kind: "verification",
      createdAt: "2026-05-20T13:05:00.000Z",
      data: { commands: [{ name: "test", command: "pnpm test", exitCode: 0 }] }
    });
    expect(snapshot).toEqual(latest);
  });

  it("rejects invalid portable cache artifacts without writing cache files", async () => {
    const root = await makeRepo();
    const importPath = join(root, "invalid-cache.json");
    await writeFile(
      importPath,
      `${JSON.stringify(
        {
          version: 1,
          kind: "verification",
          createdAt: "2026-05-20",
          data: { commands: [] }
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    process.chdir(root);
    captureOutput();

    await expect(
      new Command().exitOverride().addCommand(createCacheCommand()).parseAsync(["node", "test", "cache", "import", importPath])
    ).rejects.toThrow("Invalid cache artifact");
    await expect(readdir(join(root, ".handoffkit"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("resumes directly from the latest cached resume artifact", async () => {
    const root = await makeRepo();
    process.chdir(root);
    await writeCacheArtifact(
      root,
      "resume",
      {
        goal: "Cached goal",
        source: {
          path: "previous.txt",
          preview: "assistant: Done: Cached work",
          state: {
            completed: [{ text: "Cached work", sourceHeading: "Done" }],
            remaining: [{ text: "Run cached follow-up", sourceHeading: "Next steps" }],
            failedCommands: [],
            openQuestions: [],
            verification: [],
            nextSafestAction: "Run cached follow-up"
          }
        }
      },
      { now: new Date("2026-05-20T11:00:00.000Z") }
    );
    const output = captureOutput();

    await new Command()
      .exitOverride()
      .addCommand(createResumeCommand())
      .parseAsync(["node", "test", "resume", "--from-cache", "latest", "--goal", "Continue cached session", "--format", "json"]);
    const parsed = JSON.parse(output.stdout());

    expect(parsed.resumeSource).toMatchObject({
      path: "previous.txt",
      state: {
        completed: [{ text: "Cached work", sourceHeading: "Done" }],
        remaining: [{ text: "Run cached follow-up", sourceHeading: "Next steps" }],
        nextSafestAction: "Run cached follow-up"
      }
    });
  });

  it("includes recent cache summaries in pack output only when requested", async () => {
    const root = await makeRepo();
    process.chdir(root);
    await writeCacheArtifact(root, "verification", { commands: [] }, { now: new Date("2026-05-20T12:00:00.000Z") });
    await writeCacheArtifact(root, "resume", { goal: "Cached resume", source: { path: "previous.txt", preview: "Done" } }, { now: new Date("2026-05-20T12:05:00.000Z") });

    const defaultOutput = captureOutput();
    await new Command().exitOverride().addCommand(createPackCommand()).parseAsync(["node", "test", "pack", "--format", "json", "--no-diff"]);
    expect(JSON.parse(defaultOutput.stdout()).cache).toBeUndefined();

    const cacheOutput = captureOutput();
    await new Command()
      .exitOverride()
      .addCommand(createPackCommand())
      .parseAsync(["node", "test", "pack", "--format", "json", "--no-diff", "--include-cache"]);
    const parsed = JSON.parse(cacheOutput.stdout());

    expect(parsed.cache.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "verification", name: "latest", createdAt: "2026-05-20T12:00:00.000Z" }),
        expect.objectContaining({ kind: "resume", name: "latest", createdAt: "2026-05-20T12:05:00.000Z" })
      ])
    );
  });
});

async function makeRepo() {
  const root = await mkdtemp(join(tmpdir(), "handoffkit-cache-"));
  await execa("git", ["init", "--initial-branch=main"], { cwd: root });
  await writeFile(join(root, "README.md"), "# Demo\n", "utf8");
  return root;
}

function captureOutput() {
  let stdout = "";
  let stderr = "";

  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    stdout += chunk.toString();
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr += chunk.toString();
    return true;
  });

  return {
    stdout: () => stdout,
    stderr: () => stderr
  };
}
