import { describe, expect, it } from "vitest";

import { renderScanMarkdown } from "../../src/cli/commands/scan-secrets.js";
import type { SecretScannerReport } from "../../src/types.js";

describe("renderScanMarkdown", () => {
  it("renders config and install guidance for scan results", () => {
    const report: SecretScannerReport = {
      scanners: [
        {
          name: "gitleaks",
          available: false,
          configFiles: [".gitleaks.toml"],
          configHint: "config: .gitleaks.toml",
          installHint: "Install gitleaks from https://github.com/gitleaks/gitleaks, then rerun with --scan-secrets."
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
        }
      ]
    };

    const markdown = renderScanMarkdown(report);

    expect(markdown).toContain("- gitleaks: Scanner binary not found.");
    expect(markdown).toContain("config: .gitleaks.toml");
    expect(markdown).toContain("Install gitleaks");
  });
});
