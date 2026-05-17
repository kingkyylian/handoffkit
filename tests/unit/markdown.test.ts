import { describe, expect, it } from "vitest";

import { renderMarkdownReport } from "../../src/report/markdown.js";
import type { HandoffReport } from "../../src/types.js";

describe("renderMarkdownReport", () => {
  it("renders a compact deterministic handoff document", () => {
    const report: HandoffReport = {
      goal: "Make the tests pass",
      repository: {
        name: "demo",
        branch: "main",
        status: "## main\n M src/index.ts",
        recentCommits: ["abc1234 Add CLI"],
        changedFiles: ["src/index.ts"],
        stagedDiffSummary: "",
        unstagedDiffSummary: " src/index.ts | 2 +-",
        includeDiff: false
      },
      instructionFiles: [{ path: "AGENTS.md", kind: "agents", preview: "Use pnpm test before handoff." }],
      packageInfo: {
        name: "demo",
        packageManager: "pnpm",
        verificationScripts: [
          { name: "build", command: "tsup" },
          { name: "test", command: "vitest run" }
        ]
      },
      budget: { requestedTokens: 4000, estimatedTokens: 0, wasTrimmed: false }
    };

    const markdown = renderMarkdownReport(report);

    expect(markdown).toContain("# Handoff Packet");
    expect(markdown).toContain("Make the tests pass");
    expect(markdown).toContain("- Branch: `main`");
    expect(markdown).toContain("- `AGENTS.md` (agents)");
    expect(markdown).toContain("Use pnpm test before handoff.");
    expect(markdown).toContain("- `pnpm build`");
    expect(markdown).toContain("No LLM APIs were called.");
    expect(markdown).not.toContain("undefined");
  });
});
