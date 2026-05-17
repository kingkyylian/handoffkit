import { describe, expect, it } from "vitest";

import { formatScannerSummary, normalizeGitleaksFindings, normalizeSecretlintFindings } from "../../src/core/scanners.js";

describe("formatScannerSummary", () => {
  it("summarizes optional secret scanner availability", () => {
    expect(formatScannerSummary({
      scanners: [
        { name: "gitleaks", available: false },
        { name: "secretlint", available: true }
      ]
    })).toContain("secretlint: available");
  });

  it("normalizes and redacts gitleaks JSON findings with a stable limit", () => {
    const findings = normalizeGitleaksFindings(JSON.stringify([
      {
        RuleID: "generic-api-key",
        Description: "API key",
        File: ".env",
        StartLine: 2,
        Secret: "sk-test1234567890abcdef",
        Match: "OPENAI_API_KEY=sk-test1234567890abcdef"
      }
    ]), 10);

    expect(findings).toEqual([
      {
        ruleId: "generic-api-key",
        message: "API key",
        file: ".env",
        line: 2
      }
    ]);
    expect(JSON.stringify(findings)).not.toContain("sk-test1234567890abcdef");
  });

  it("normalizes secretlint JSON findings with redacted messages", () => {
    const findings = normalizeSecretlintFindings(JSON.stringify([
      {
        filePath: "/repo/.env",
        messages: [
          {
            ruleId: "@secretlint/secretlint-rule-preset-recommend > secretlint-rule-no-dotenv",
            message: "found secret sk-test1234567890abcdef",
            line: 4
          }
        ]
      }
    ]), 10, "/repo");

    expect(findings).toEqual([
      {
        ruleId: "@secretlint/secretlint-rule-preset-recommend > secretlint-rule-no-dotenv",
        message: "found secret [REDACTED]",
        file: ".env",
        line: 4
      }
    ]);
  });
});
