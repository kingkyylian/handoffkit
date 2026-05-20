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
      cache: {
        artifacts: [{ kind: "resume", name: "latest", createdAt: "2026-05-20T12:05:00.000Z", path: ".handoffkit/resume/latest.json" }]
      },
      risk: {
        notes: [{ severity: "medium", title: "Source changed without tests", detail: "Review test coverage for src/index.ts." }]
      },
      secretScanning: {
        scanners: [
          {
            name: "gitleaks",
            available: false,
            configFiles: [".gitleaks.toml"],
            configHint: "config: .gitleaks.toml",
            installHint: "Install gitleaks from https://github.com/gitleaks/gitleaks, then rerun with --scan-secrets."
          },
          {
            name: "secretlint",
            available: true,
            configFiles: [".secretlintrc.json"],
            configHint: "config: .secretlintrc.json",
            installHint: "Install secretlint from https://github.com/secretlint/secretlint, then rerun with --scan-secrets."
          }
        ],
        scans: [
          {
            name: "gitleaks",
            available: false,
            ran: false,
            findings: [],
            error: "Scanner binary not found.",
            truncated: false
          },
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
    expect(markdown).toContain("## Cache Artifacts");
    expect(markdown).toContain("resume/latest");
    expect(markdown).toContain("## Risk Notes");
    expect(markdown).toContain("Source changed without tests");
    expect(markdown).toContain("secretlint");
    expect(markdown).toContain("config: .secretlintrc.json");
    expect(markdown).toContain("Install gitleaks");
    expect(markdown).toContain("dotenv secret");
    expect(markdown).toContain("- `pnpm build`");
    expect(markdown).toContain("## Resume State");
    expect(markdown).toContain("Published v0.1.0");
    expect(markdown).toContain("Next safest action: Add release smoke script");
    expect(markdown).toContain("No LLM APIs were called.");
    expect(markdown).not.toContain("undefined");
  });

  it("renders target-specific profile titles, section order, and action notes without changing source facts", () => {
    const base = minimalReport();
    const generic = renderMarkdownReport({ ...base, target: "generic" });
    const codex = renderMarkdownReport({ ...base, target: "codex" });
    const claude = renderMarkdownReport({ ...base, target: "claude" });
    const cursor = renderMarkdownReport({ ...base, target: "cursor" });

    expect(generic).toContain("# Handoff Packet");
    expect(generic).toContain("Use this packet as the starting context for the next coding session.");
    expect(codex).toContain("# Codex Handoff Packet");
    expect(codex).toContain("Use local tools to inspect files before editing");
    expect(claude).toContain("# Claude Code Handoff Packet");
    expect(claude).toContain("Treat this as concise project memory plus current branch state.");
    expect(cursor).toContain("# Cursor Handoff Packet");
    expect(cursor).toContain("Open the changed files first to build editor context.");

    for (const markdown of [generic, codex, claude, cursor]) {
      expect(markdown).toContain("- Repository: `demo`");
      expect(markdown).toContain("- Branch: `main`");
      expect(markdown).toContain("- `src/index.ts`");
      expect(markdown).toContain("pnpm run test");
      expect(markdown).toContain("Continue release notes");
    }

    expect(indexOfSection(generic, "## Repository")).toBeLessThan(indexOfSection(generic, "## Git Status"));
    expect(indexOfSection(codex, "## Verification")).toBeLessThan(indexOfSection(codex, "## Diff Summary"));
    expect(indexOfSection(claude, "## Resume State")).toBeLessThan(indexOfSection(claude, "## Repository"));
    expect(indexOfSection(cursor, "## Changed Files")).toBeLessThan(indexOfSection(cursor, "## Git Status"));
  });
});

function minimalReport(): HandoffReport {
  return {
    goal: "Resume implementation",
    target: "generic",
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
    instructionFiles: [],
    packageInfo: {
      name: "demo",
      packageManager: "pnpm",
      verificationScripts: [{ name: "test", command: "vitest run" }]
    },
    resumeSource: {
      path: "previous.md",
      preview: "Previous handoff",
      state: {
        completed: [{ text: "Drafted changelog" }],
        remaining: [{ text: "Continue release notes" }],
        failedCommands: [],
        openQuestions: [],
        verification: [],
        nextSafestAction: "Continue release notes"
      }
    },
    verification: {
      commands: [{ name: "test", command: "pnpm run test", exitCode: 0, durationMs: 120, output: "passed" }]
    },
    risk: {
      notes: [{ severity: "low", title: "Docs-only follow-up", detail: "Review wording before release." }]
    },
    budget: { requestedTokens: 4000, estimatedTokens: 0, wasTrimmed: false }
  };
}

function indexOfSection(markdown: string, section: string) {
  const index = markdown.indexOf(section);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}
