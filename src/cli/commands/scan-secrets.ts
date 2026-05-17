import { Command } from "commander";
import { z } from "zod";

import { findGitRoot } from "../../core/git.js";
import { redactText } from "../../core/redact.js";
import { runSecretScanners } from "../../core/scanners.js";

const ScanSecretsOptionsSchema = z.object({
  format: z.enum(["markdown", "json"]).default("markdown")
});

export function createScanSecretsCommand() {
  return new Command("scan-secrets")
    .description("Run optional local secret scanners and print bounded redacted results.")
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

function renderScanMarkdown(report: Awaited<ReturnType<typeof runSecretScanners>>) {
  const lines = ["# Secret Scan Results", ""];

  for (const scan of report.scans ?? []) {
    lines.push(`- ${scan.name}: ${scan.ran ? `${scan.findings.length} finding(s), exit ${scan.exitCode}` : scan.error ?? "not run"}`);

    for (const finding of scan.findings) {
      lines.push(`  - ${finding.ruleId ? `${finding.ruleId}: ` : ""}${finding.message}${finding.file ? ` (${finding.file}${finding.line ? `:${finding.line}` : ""})` : ""}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
