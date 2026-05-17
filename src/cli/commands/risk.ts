import { Command } from "commander";
import { z } from "zod";

import { collectHandoffReport } from "../../core/collect.js";

const RiskOptionsSchema = z.object({
  format: z.enum(["markdown", "json"]).default("markdown")
});

export function createRiskCommand() {
  return new Command("risk")
    .description("Show deterministic risk notes for the current handoff.")
    .option("--format <format>", "output format: markdown or json", "markdown")
    .action(async (rawOptions) => {
      const options = RiskOptionsSchema.parse(rawOptions);
      const report = await collectHandoffReport({
        goal: "Review local risk",
        cwd: process.cwd(),
        format: options.format,
        target: "generic",
        budget: 4000,
        includeDiff: false,
        includeDiffSummary: false,
        includeVerification: false
      });

      if (options.format === "json") {
        process.stdout.write(`${JSON.stringify(report.risk, null, 2)}\n`);
        return;
      }

      process.stdout.write(`# Risk Notes\n\n${report.risk?.notes.map((note) => `- **${note.severity}**: ${note.title} - ${note.detail}`).join("\n")}\n`);
    });
}
