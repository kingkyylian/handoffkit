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
});
