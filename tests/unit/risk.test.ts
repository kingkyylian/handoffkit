import { describe, expect, it } from "vitest";

import { analyzeRisk } from "../../src/core/risk.js";
import type { HandoffReport } from "../../src/types.js";

describe("analyzeRisk", () => {
  function reportWithChangedFiles(changedFiles: string[]): HandoffReport {
    return {
      goal: "Review risk",
      target: "generic",
      repository: {
        name: "demo",
        branch: "main",
        status: "",
        recentCommits: [],
        changedFiles,
        stagedDiffSummary: "",
        unstagedDiffSummary: "",
        includeDiff: false
      },
      instructionFiles: [],
      budget: { requestedTokens: 4000, estimatedTokens: 0, wasTrimmed: false }
    };
  }

  it("flags config, lockfile, security, and source-without-test changes", () => {
    const report = reportWithChangedFiles(["src/core/redact.ts", "package.json", "pnpm-lock.yaml", ".github/workflows/ci.yml"]);

    const risk = analyzeRisk(report);

    expect(risk.notes.map((note) => note.title)).toEqual(
      expect.arrayContaining([
        "Security-sensitive code changed",
        "Release or package publishing path changed",
        "CI workflow changed",
        "Source changed without matching tests"
      ])
    );
  });

  it("marks release and package publishing changes as high-risk with release verification guidance", () => {
    const risk = analyzeRisk(reportWithChangedFiles(["docs/RELEASE.md", ".github/workflows/release.yml", "scripts/release-smoke.mjs"]));

    expect(risk.notes).toContainEqual(
      expect.objectContaining({
        severity: "high",
        title: "Release or package publishing path changed",
        detail: expect.stringContaining("pnpm smoke:release")
      })
    );
    expect(risk.notes.find((note) => note.title === "Release or package publishing path changed")?.detail).toContain("pnpm pack:dry-run");
  });

  it("maps common file groups to specific failure mode notes", () => {
    const risk = analyzeRisk(
      reportWithChangedFiles([
        "src/cli/index.ts",
        "src/core/resume.ts",
        "src/report/markdown.ts",
        "tsup.config.ts",
        ".gitignore",
        "docs/checkpoints/README.md",
        "README.md"
      ])
    );

    expect(risk.notes.map((note) => note.title)).toEqual(
      expect.arrayContaining([
        "CLI behavior changed",
        "Resume parsing changed",
        "Handoff report rendering changed",
        "Build tooling or TypeScript config changed",
        "Generated artifact or ignore policy changed",
        "Documentation changed"
      ])
    );
  });
});
