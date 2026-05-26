import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkpointFilename, renderCheckpointMarkdown, writeCheckpointFiles } from "../../src/core/checkpoint.js";
import type { HandoffReport } from "../../src/types.js";

describe("checkpoint", () => {
  it("creates a minute-level UTC-safe filename", () => {
    expect(checkpointFilename(new Date("2026-05-26T13:04:59.000Z"))).toBe("2026-05-26-1304.md");
  });

  it("renders a checkpoint with resume instructions", () => {
    const report = minimalReport(["README.md"]);
    const markdown = renderCheckpointMarkdown(report, new Date("2026-05-26T13:04:59.000Z"));

    expect(markdown).toContain("# Project Checkpoint - 2026-05-26 13:04");
    expect(markdown).toContain("## Current State");
    expect(markdown).toContain("- `README.md`");
    expect(markdown).toContain("handoffkit resume docs/checkpoints/LATEST.md");
  });

  it("writes timestamped and latest checkpoint files with redacted content", async () => {
    const root = await mkdtemp(join(tmpdir(), "handoffkit-checkpoint-"));
    const markdown = "Goal: OPENAI_API_KEY=sk-test1234567890abcdef\n";

    const result = await writeCheckpointFiles(root, "docs/checkpoints", markdown, new Date("2026-05-26T13:04:59.000Z"));

    expect(result.checkpointPath).toBe(join(root, "docs/checkpoints/2026-05-26-1304.md"));
    expect(result.latestPath).toBe(join(root, "docs/checkpoints/LATEST.md"));
    await expect(readFile(result.checkpointPath, "utf8")).resolves.toContain("OPENAI_API_KEY=[REDACTED]");
    await expect(readFile(result.latestPath, "utf8")).resolves.not.toContain("sk-test1234567890abcdef");
  });
});

function minimalReport(changedFiles: string[]): HandoffReport {
  return {
    goal: "Continue this branch",
    target: "generic",
    repository: {
      name: "demo",
      branch: "main",
      status: " M README.md",
      recentCommits: ["abc123 Release v0.6.0"],
      changedFiles,
      stagedDiffSummary: "",
      unstagedDiffSummary: "",
      includeDiff: false
    },
    instructionFiles: [],
    budget: { requestedTokens: 4000, estimatedTokens: 0, wasTrimmed: false }
  };
}
