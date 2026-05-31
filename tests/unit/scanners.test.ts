import { chmod, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { detectSecretScanners, formatScannerSummary, normalizeGitleaksFindings, normalizeSecretlintFindings, runSecretScanners } from "../../src/core/scanners.js";

describe("formatScannerSummary", () => {
  it("summarizes optional secret scanner availability", () => {
    expect(formatScannerSummary({
      scanners: [
        {
          name: "gitleaks",
          available: false,
          configFiles: [],
          configHint: "config: none detected",
          installHint: "Install gitleaks"
        },
        {
          name: "secretlint",
          available: true,
          configFiles: [],
          configHint: "config: none detected",
          installHint: "Install secretlint"
        }
      ]
    })).toContain("secretlint: available");
  });

  it("reports scanner config files and install hints", async () => {
    const root = await mkdtemp(join(tmpdir(), "handoffkit-scanners-"));
    await writeFile(join(root, ".gitleaks.toml"), "[allowlist]\n", "utf8");
    await writeFile(join(root, ".secretlintrc.json"), "{}\n", "utf8");

    const report = await detectSecretScanners(root);

    expect(report.scanners.find((scanner) => scanner.name === "gitleaks")?.configFiles).toEqual([".gitleaks.toml"]);
    expect(report.scanners.find((scanner) => scanner.name === "secretlint")?.configFiles).toEqual([".secretlintrc.json"]);
    expect(report.scanners.find((scanner) => scanner.name === "gitleaks")?.installHint).toContain("Install gitleaks");
    expect(formatScannerSummary(report)).toContain("config: .secretlintrc.json");
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

  it("cleans up temporary gitleaks report directories after scans", async () => {
    const root = await mkdtemp(join(tmpdir(), "handoffkit-scanners-root-"));
    const bin = await mkdtemp(join(tmpdir(), "handoffkit-scanners-bin-"));
    const fakeGitleaks = join(bin, "gitleaks");
    const fakeSecretlint = join(bin, "secretlint");
    const originalPath = process.env.PATH;
    const before = await handoffkitGitleaksTempDirs();

    await writeFile(
      fakeGitleaks,
      [
        "#!/bin/sh",
        "report_path=",
        "while [ \"$#\" -gt 0 ]; do",
        "  if [ \"$1\" = \"--version\" ]; then echo 'fake gitleaks 1.0.0'; exit 0; fi",
        "  if [ \"$1\" = \"--report-path\" ]; then shift; report_path=\"$1\"; fi",
        "  shift",
        "done",
        "printf '[]' > \"$report_path\"",
        "exit 0",
        ""
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      fakeSecretlint,
      [
        "#!/bin/sh",
        "exit 1",
        ""
      ].join("\n"),
      "utf8"
    );
    await chmod(fakeGitleaks, 0o755);
    await chmod(fakeSecretlint, 0o755);

    process.env.PATH = `${bin}:${originalPath ?? ""}`;
    try {
      const report = await runSecretScanners(root);
      expect(report.scans?.find((scan) => scan.name === "gitleaks")).toEqual(expect.objectContaining({ ran: true, findings: [] }));
    } finally {
      process.env.PATH = originalPath;
    }

    const after = await handoffkitGitleaksTempDirs();
    expect([...after].filter((entry) => !before.has(entry))).toEqual([]);
  });

  it("returns a timeout result and cleans up gitleaks temporary report directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "handoffkit-scanners-root-"));
    const bin = await mkdtemp(join(tmpdir(), "handoffkit-scanners-bin-"));
    const fakeGitleaks = join(bin, "gitleaks");
    const fakeSecretlint = join(bin, "secretlint");
    const originalPath = process.env.PATH;
    const before = await handoffkitGitleaksTempDirs();

    await writeFile(
      fakeGitleaks,
      [
        "#!/bin/sh",
        "while [ \"$#\" -gt 0 ]; do",
        "  if [ \"$1\" = \"--version\" ]; then echo 'fake gitleaks 1.0.0'; exit 0; fi",
        "  shift",
        "done",
        "while true; do sleep 1; done",
        ""
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      fakeSecretlint,
      [
        "#!/bin/sh",
        "exit 1",
        ""
      ].join("\n"),
      "utf8"
    );
    await chmod(fakeGitleaks, 0o755);
    await chmod(fakeSecretlint, 0o755);

    process.env.PATH = `${bin}:${originalPath ?? ""}`;
    try {
      const report = await runSecretScanners(root, { timeoutMs: 500 });
      const scan = report.scans?.find((result) => result.name === "gitleaks");

      expect(scan).toEqual(expect.objectContaining({
        ran: false,
        exitCode: 124,
        timedOut: true,
        findings: [],
        error: expect.stringContaining("timed out")
      }));
    } finally {
      process.env.PATH = originalPath;
    }

    const after = await handoffkitGitleaksTempDirs();
    expect([...after].filter((entry) => !before.has(entry))).toEqual([]);
  });

  it("returns a timeout result when secretlint exceeds the scanner timeout", async () => {
    const root = await mkdtemp(join(tmpdir(), "handoffkit-scanners-root-"));
    const bin = await mkdtemp(join(tmpdir(), "handoffkit-scanners-bin-"));
    const fakeGitleaks = join(bin, "gitleaks");
    const fakeSecretlint = join(bin, "secretlint");
    const originalPath = process.env.PATH;

    await writeFile(
      fakeGitleaks,
      [
        "#!/bin/sh",
        "exit 1",
        ""
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      fakeSecretlint,
      [
        "#!/bin/sh",
        "while [ \"$#\" -gt 0 ]; do",
        "  if [ \"$1\" = \"--version\" ]; then echo 'fake secretlint 1.0.0'; exit 0; fi",
        "  shift",
        "done",
        "while true; do sleep 1; done",
        ""
      ].join("\n"),
      "utf8"
    );
    await chmod(fakeGitleaks, 0o755);
    await chmod(fakeSecretlint, 0o755);

    process.env.PATH = `${bin}:${originalPath ?? ""}`;
    try {
      const report = await runSecretScanners(root, { timeoutMs: 500 });
      const scan = report.scans?.find((result) => result.name === "secretlint");

      expect(scan).toEqual(expect.objectContaining({
        ran: false,
        exitCode: 124,
        timedOut: true,
        findings: [],
        error: expect.stringContaining("timed out")
      }));
    } finally {
      process.env.PATH = originalPath;
    }
  });
});

async function handoffkitGitleaksTempDirs() {
  const entries = await readdir(tmpdir());
  return new Set(entries.filter((entry) => entry.startsWith("handoffkit-gitleaks-")));
}
