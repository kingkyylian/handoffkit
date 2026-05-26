import { Command } from "commander";
import { z } from "zod";

import { renderCheckpointMarkdown, writeCheckpointFiles } from "../../core/checkpoint.js";
import { collectHandoffReport } from "../../core/collect.js";
import { findGitRoot } from "../../core/git.js";

const CheckpointSaveOptionsSchema = z.object({
  goal: z.string().trim().min(1).default("Continue this project"),
  outputDir: z.string().trim().min(1).default("docs/checkpoints"),
  for: z.enum(["generic", "codex", "claude", "cursor"]).default("generic"),
  budget: z.number().int().positive().default(4000),
  verify: z.boolean().default(false)
});

export function createCheckpointCommand() {
  return new Command("checkpoint")
    .description("Create durable local progress checkpoints.")
    .summary("Create timestamped local checkpoint files.")
    .addCommand(createCheckpointSaveCommand());
}

function createCheckpointSaveCommand() {
  return new Command("save")
    .description("Write a timestamped checkpoint and update LATEST.md.")
    .summary("Save current handoff state to docs/checkpoints.")
    .option("--goal <text>", "checkpoint goal", "Continue this project")
    .option("--output-dir <path>", "checkpoint directory", "docs/checkpoints")
    .option("--for <agent>", "target output: generic, codex, claude, or cursor", "generic")
    .option("--budget <tokens>", "rough output token budget", parseBudget, 4000)
    .option("--verify", "run safe verification scripts and include results")
    .action(async (rawOptions) => {
      const options = parseOptions(rawOptions);
      const root = await findGitRoot(process.cwd());
      const report = await collectHandoffReport({
        goal: options.goal,
        cwd: process.cwd(),
        format: "markdown",
        target: options.for,
        budget: options.budget,
        includeDiff: false,
        includeDiffSummary: true,
        includeVerification: options.verify,
        scanSecrets: false,
        includeCache: false
      });
      const now = new Date();
      const checkpoint = await writeCheckpointFiles(root, options.outputDir, renderCheckpointMarkdown(report, now, options.outputDir), now);

      process.stderr.write(`Wrote checkpoint to ${checkpoint.checkpointPath}\n`);
      process.stderr.write(`Updated latest checkpoint at ${checkpoint.latestPath}\n`);
    });
}

function parseOptions(rawOptions: unknown) {
  const result = CheckpointSaveOptionsSchema.safeParse(rawOptions);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("\n");
    throw new Error(`Invalid checkpoint options:\n${message}`);
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
