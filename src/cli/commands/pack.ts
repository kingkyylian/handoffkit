import { Command } from "commander";
import { z } from "zod";

import { collectHandoffReport } from "../../core/collect.js";
import { writeRenderedReport } from "../output.js";

const PackCliOptionsSchema = z.object({
  goal: z.string().trim().min(1).default("Make your own goal"),
  output: z.string().optional(),
  format: z.enum(["markdown", "json"]).default("markdown"),
  for: z.enum(["generic", "codex", "claude", "cursor"]).default("generic"),
  budget: z.number().int().positive().default(4000),
  includeDiff: z.boolean().default(false),
  diff: z.boolean().default(true),
  since: z.string().trim().min(1).optional(),
  verify: z.boolean().default(false),
  scanSecrets: z.boolean().default(false)
});

export function createPackCommand() {
  return new Command("pack")
    .description("Create a safe local handoff packet for another AI assistant.")
    .summary("Create a Markdown or JSON packet from the current git state.")
    .option("--goal <text>", "handoff goal", "Make your own goal")
    .option("--output <path>", "write output to a file instead of stdout")
    .option("--format <format>", "output format: markdown or json", "markdown")
    .option("--for <agent>", "target output: generic, codex, claude, or cursor", "generic")
    .option("--budget <tokens>", "rough output token budget", parseBudget, 4000)
    .option("--since <ref>", "focus committed branch delta on a base ref")
    .option("--verify", "run safe verification scripts and include results")
    .option("--scan-secrets", "run optional local secret scanners and include bounded results")
    .option("--include-diff", "include full staged and unstaged patches", false)
    .option("--no-diff", "omit diff summaries and full patches")
    .action(async (rawOptions) => {
      const options = parseOptions(rawOptions);
      const report = await collectHandoffReport({
        goal: options.goal,
        cwd: process.cwd(),
        ...(options.output ? { output: options.output } : {}),
        format: options.format,
        target: options.for,
        budget: options.budget,
        includeDiff: options.includeDiff,
        includeDiffSummary: options.diff,
        ...(options.since ? { since: options.since } : {}),
        includeVerification: options.verify,
        scanSecrets: options.scanSecrets
      });

      await writeRenderedReport(report, options.format, options.budget, options.output);
    });
}

function parseOptions(rawOptions: unknown) {
  const result = PackCliOptionsSchema.safeParse(rawOptions);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("\n");
    throw new Error(`Invalid pack options:\n${message}`);
  }

  return result.data;
}

function parseBudget(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("--budget must be a positive integer.");
  }

  return parsed;
}
