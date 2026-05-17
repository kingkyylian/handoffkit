import { readFile } from "node:fs/promises";

import { Command } from "commander";
import { z } from "zod";

import { collectHandoffReport } from "../../core/collect.js";
import { createResumeSource } from "../../core/resume.js";
import { writeRenderedReport } from "../output.js";

const ResumeOptionsSchema = z.object({
  goal: z.string().trim().min(1).default("Resume interrupted AI coding session"),
  output: z.string().optional(),
  format: z.enum(["markdown", "json"]).default("markdown"),
  for: z.enum(["generic", "codex", "claude", "cursor"]).default("generic"),
  budget: z.number().int().positive().default(4000)
});

export function createResumeCommand() {
  return new Command("resume")
    .description("Create a fresh handoff packet using a previous handoff as resume context.")
    .summary("Merge a previous handoff or transcript with fresh repo state.")
    .argument("<path>", "previous handoff or transcript file")
    .option("--goal <text>", "new handoff goal", "Resume interrupted AI coding session")
    .option("--output <path>", "write output to a file instead of stdout")
    .option("--format <format>", "output format: markdown or json", "markdown")
    .option("--for <agent>", "target output: generic, codex, claude, or cursor", "generic")
    .option("--budget <tokens>", "rough output token budget", parseBudget, 4000)
    .action(async (path: string, rawOptions) => {
      const options = ResumeOptionsSchema.parse(rawOptions);
      const source = createResumeSource(path, await readFile(path, "utf8"));
      const report = await collectHandoffReport({
        goal: options.goal,
        cwd: process.cwd(),
        ...(options.output ? { output: options.output } : {}),
        format: options.format,
        target: options.for,
        budget: options.budget,
        includeDiff: false,
        includeDiffSummary: true,
        includeVerification: false,
        scanSecrets: false,
        resumeSource: source
      });

      await writeRenderedReport(report, options.format, options.budget, options.output);
    });
}

function parseBudget(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("--budget must be a positive integer.");
  }

  return parsed;
}
