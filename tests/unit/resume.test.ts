import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createResumeSource } from "../../src/core/resume.js";

describe("createResumeSource", () => {
  it("extracts a redacted compact preview from a previous handoff", () => {
    const source = createResumeSource("previous.md", [
      "# Handoff Packet",
      "## Goal",
      "Finish auth",
      "OPENAI_API_KEY=sk-test1234567890abcdef"
    ].join("\n"));

    expect(source.path).toBe("previous.md");
    expect(source.preview).toContain("Finish auth");
    expect(source.preview).toContain("OPENAI_API_KEY=[REDACTED]");
    expect(source.preview).not.toContain("sk-test1234567890abcdef");
  });

  it("extracts structured resume state from common handoff headings", () => {
    const content = readFileSync(new URL("../fixtures/resume/basic-handoff.md", import.meta.url), "utf8");
    const source = createResumeSource("previous.md", content);

    expect(source.state?.completed.map((item) => item.text)).toEqual(["Added pack command", "Published v0.1.0"]);
    expect(source.state?.remaining.map((item) => item.text)).toEqual(["Add release smoke script"]);
    expect(source.state?.failedCommands.map((item) => item.text)).toEqual(["pnpm dlx failed with ENOTFOUND"]);
    expect(source.state?.openQuestions.map((item) => item.text)).toEqual(["Should v0.2 focus on resume?"]);
    expect(source.state?.verification.map((item) => item.text)).toEqual(["pnpm check passed"]);
    expect(source.state?.nextSafestAction).toBe("Add release smoke script");
  });

  it("recognizes project checkpoint headings", () => {
    const source = createResumeSource("docs/checkpoints/LATEST.md", [
      "# Project Checkpoint",
      "## Done This Session",
      "- Implemented structured resume parsing",
      "## Open Questions / Risks",
      "- NPM_TOKEN is missing",
      "## Next Steps",
      "1. Add profile-specific report notes",
      "## Verification",
      "- pnpm check passed"
    ].join("\n"));

    expect(source.state?.completed.map((item) => item.text)).toEqual(["Implemented structured resume parsing"]);
    expect(source.state?.openQuestions.map((item) => item.text)).toEqual(["NPM_TOKEN is missing"]);
    expect(source.state?.remaining.map((item) => item.text)).toEqual(["Add profile-specific report notes"]);
    expect(source.state?.verification.map((item) => item.text)).toEqual(["pnpm check passed"]);
    expect(source.state?.nextSafestAction).toBe("Add profile-specific report notes");
  });

  it("extracts structured resume state from Codex and Claude-style transcript sections", () => {
    const content = readFileSync(new URL("../fixtures/resume/codex-transcript.txt", import.meta.url), "utf8");
    const source = createResumeSource("codex-transcript.txt", content);

    expect(source.state?.completed.map((item) => item.text)).toEqual(["Added release smoke coverage", "Published v0.2.0"]);
    expect(source.state?.remaining.map((item) => item.text)).toEqual(["Add transcript parser fixtures", "Document cache layout"]);
    expect(source.state?.failedCommands.map((item) => item.text)).toEqual(["gh workflow run Release failed because NPM_TOKEN was invalid"]);
    expect(source.state?.verification.map((item) => item.text)).toEqual(["pnpm check passed", "CI passed on main"]);
    expect(source.state?.openQuestions.map((item) => item.text)).toEqual(["Should transcript parsing handle Cursor exports?"]);
    expect(source.state?.nextSafestAction).toBe("Add transcript parser fixtures");
  });

  it("extracts structured resume state from Cursor and Gemini-style inline transcript labels", () => {
    const content = readFileSync(new URL("../fixtures/resume/cursor-gemini-transcript.txt", import.meta.url), "utf8");
    const source = createResumeSource("cursor-gemini-transcript.txt", content);

    expect(source.state?.completed.map((item) => item.text)).toEqual(["Refactored resume parser"]);
    expect(source.state?.remaining.map((item) => item.text)).toEqual(["Add fixture coverage for Gemini exports"]);
    expect(source.state?.failedCommands.map((item) => item.text)).toEqual(["pnpm test tests/unit/resume.test.ts failed"]);
    expect(source.state?.verification.map((item) => item.text)).toEqual(["pnpm test passed after parser update"]);
    expect(source.state?.openQuestions.map((item) => item.text)).toEqual(["Should copied chat labels be preserved?"]);
    expect(source.state?.nextSafestAction).toBe("Add fixture coverage for Gemini exports");
  });
});
