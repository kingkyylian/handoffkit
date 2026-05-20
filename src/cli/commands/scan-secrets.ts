import { Command } from "commander";
import { z } from "zod";

import { findGitRoot } from "../../core/git.js";
import { redactText } from "../../core/redact.js";
import { runSecretScanners } from "../../core/scanners.js";
import type { SecretScannerReport, SecretScannerStatus } from "../../types.js";

const ScanSecretsOptionsSchema = z.object({
  format: z.enum(["markdown", "json"]).default("markdown")
});

export function createScanSecretsCommand() {
  return new Command("scan-secrets")
    .description("Run optional local secret scanners and print bounded redacted results.")
    .summary("Run optional local secret scanners.")
    .option("--format <format>", "output format: markdown or json", "markdown")
    .action(async (rawOptions) => {
      const options = ScanSecretsOptionsSchema.parse(rawOptions);
      const root = await findGitRoot(process.cwd());
      const report = await runSecretScanners(root);

      if (options.format === "json") {
        process.stdout.write(redactText(`${JSON.stringify(report, null, 2)}\n`));
        return;
      }

      process.stdout.write(redactText(renderScanMarkdown(report)));
    });
}

export function renderScanMarkdown(report: SecretScannerReport) {
  const lines = ["# Secret Scan Results", ""];

  for (const scan of report.scans ?? []) {
    const status = report.scanners.find((scanner) => scanner.name === scan.name);
    lines.push(`- ${scan.name}: ${scan.ran ? `${scan.findings.length} finding(s), exit ${scan.exitCode}` : scan.error ?? "not run"}`);

    if (status) {
      lines.push(...scannerGuidanceLines(status));
    }

    for (const finding of scan.findings) {
      lines.push(`  - ${finding.ruleId ? `${finding.ruleId}: ` : ""}${finding.message}${finding.file ? ` (${finding.file}${finding.line ? `:${finding.line}` : ""})` : ""}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function scannerGuidanceLines(scanner: SecretScannerStatus) {
  const lines: string[] = [];

  if (scanner.configFiles.length > 0) {
    lines.push(`  - config: ${scanner.configFiles.join(", ")}`);
  } else if (!scanner.available) {
    lines.push(`  - ${scanner.configHint}`);
  }

  if (!scanner.available) {
    lines.push(`  - ${scanner.installHint}`);
  }

  return lines;
}
