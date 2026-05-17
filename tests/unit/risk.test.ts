import { describe, expect, it } from "vitest";

import { analyzeRisk } from "../../src/core/risk.js";
import type { HandoffReport } from "../../src/types.js";

describe("analyzeRisk", () => {
  it("flags config, lockfile, security, and source-without-test changes", () => {
    const report: HandoffReport = {
      goal: "Review risk",
      target: "generic",
      repository: {
        name: "demo",
        branch: "main",
        status: "",
        recentCommits: [],
        changedFiles: ["src/core/redact.ts", "package.json", "pnpm-lock.yaml", ".github/workflows/ci.yml"],
        stagedDiffSummary: "",
        unstagedDiffSummary: "",
        includeDiff: false
      },
      instructionFiles: [],
      budget: { requestedTokens: 4000, estimatedTokens: 0, wasTrimmed: false }
    };

    const risk = analyzeRisk(report);

    expect(risk.notes.map((note) => note.title)).toEqual(
      expect.arrayContaining([
        "Security-sensitive code changed",
        "Dependency or package metadata changed",
        "CI workflow changed",
        "Source changed without matching tests"
      ])
    );
  });
});
