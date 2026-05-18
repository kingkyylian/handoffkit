import { describe, expect, it } from "vitest";

import { renderMarkdownReport } from "../../src/report/markdown.js";
import type { HandoffReport } from "../../src/types.js";

describe("renderMarkdownReport", () => {
  it("renders a compact deterministic handoff document", () => {
    const report: HandoffReport = {
      goal: "Make the tests pass",
      target: "codex",
      repository: {
        name: "demo",
        branch: "main",
        baseRef: "origin/main",
        status: "## main\n M src/index.ts",
        recentCommits: ["abc1234 Add CLI"],
        changedFiles: ["src/index.ts"],
        baseDiffSummary: " src/index.ts | 2 +-",
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
      resumeSource: {
        path: "previous.md",
        preview: "Previous handoff",
        state: {
          completed: [{ text: "Published v0.1.0" }],
          remaining: [{ text: "Add release smoke script" }],
          failedCommands: [],
          openQuestions: [],
          verification: [{ text: "pnpm check passed" }],
          nextSafestAction: "Add release smoke script"
        }
      },
      verification: {
        commands: [{ name: "test", command: "pnpm run test", exitCode: 0, durationMs: 120, output: "passed" }]
      },
      risk: {
        notes: [{ severity: "medium", title: "Source changed without tests", detail: "Review test coverage for src/index.ts." }]
      },
      secretScanning: {
        scanners: [{ name: "gitleaks", available: false }, { name: "secretlint", available: true }],
        scans: [
          {
            name: "secretlint",
            available: true,
            ran: true,
            exitCode: 1,
            durationMs: 50,
            findings: [{ ruleId: "no-dotenv", message: "dotenv secret", file: ".env", line: 1 }],
            truncated: false
          }
        ]
      },
      budget: { requestedTokens: 4000, estimatedTokens: 0, wasTrimmed: false }
    };

    const markdown = renderMarkdownReport(report);

    expect(markdown).toContain("# Codex Handoff Packet");
    expect(markdown).toContain("Make the tests pass");
    expect(markdown).toContain("- Branch: `main`");
    expect(markdown).toContain("## Branch Delta Since `origin/main`");
    expect(markdown).toContain("- `AGENTS.md` (agents)");
    expect(markdown).toContain("Use pnpm test before handoff.");
    expect(markdown).toContain("## Verification");
    expect(markdown).toContain("pnpm run test");
    expect(markdown).toContain("## Risk Notes");
    expect(markdown).toContain("Source changed without tests");
    expect(markdown).toContain("secretlint");
    expect(markdown).toContain("dotenv secret");
    expect(markdown).toContain("- `pnpm build`");
    expect(markdown).toContain("## Resume State");
    expect(markdown).toContain("Published v0.1.0");
    expect(markdown).toContain("Next safest action: Add release smoke script");
    expect(markdown).toContain("No LLM APIs were called.");
    expect(markdown).not.toContain("undefined");
  });
});
