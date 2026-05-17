import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { Command } from "commander";
import { z } from "zod";

import { applyMarkdownBudget, estimateTokens } from "../../core/budget.js";
import { collectHandoffReport } from "../../core/collect.js";
import { redactText } from "../../core/redact.js";
import { renderJsonReport } from "../../report/json.js";
import { renderMarkdownReport } from "../../report/markdown.js";
import type { OutputFormat } from "../../types.js";

const PackCliOptionsSchema = z.object({
  goal: z.string().trim().min(1).default("Make your own goal"),
  output: z.string().optional(),
  format: z.enum(["markdown", "json"]).default("markdown"),
  budget: z.number().int().positive().default(4000),
  includeDiff: z.boolean().default(false),
  diff: z.boolean().default(true)
});

export function createPackCommand() {
  return new Command("pack")
    .description("Create a safe local handoff packet for another AI assistant.")
    .option("--goal <text>", "handoff goal", "Make your own goal")
    .option("--output <path>", "write output to a file instead of stdout")
    .option("--format <format>", "output format: markdown or json", "markdown")
    .option("--budget <tokens>", "rough output token budget", parseBudget, 4000)
    .option("--include-diff", "include full staged and unstaged patches", false)
    .option("--no-diff", "omit diff summaries and full patches")
    .action(async (rawOptions) => {
      const options = parseOptions(rawOptions);
      const report = await collectHandoffReport({
        goal: options.goal,
        cwd: process.cwd(),
        ...(options.output ? { output: options.output } : {}),
        format: options.format,
        budget: options.budget,
        includeDiff: options.includeDiff,
        includeDiffSummary: options.diff
      });

      const output = renderOutput(report, options.format, options.budget);
      const redactedOutput = redactText(output);

      if (options.output) {
        const outputPath = resolve(process.cwd(), options.output);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, redactedOutput, "utf8");
        process.stderr.write(`Wrote handoff packet to ${outputPath}\n`);
        return;
      }

      process.stdout.write(redactedOutput);
    });
}

function renderOutput(report: Awaited<ReturnType<typeof collectHandoffReport>>, format: OutputFormat, budget: number) {
  if (format === "json") {
    const rendered = renderJsonReport(report);
    report.budget.estimatedTokens = estimateTokens(rendered);
    return renderJsonReport(report);
  }

  const firstRender = renderMarkdownReport(report);
  const budgeted = applyMarkdownBudget(firstRender, budget);
  report.budget.estimatedTokens = budgeted.estimatedTokens;
  report.budget.wasTrimmed = budgeted.wasTrimmed;

  if (budgeted.wasTrimmed) {
    return budgeted.text;
  }

  return renderMarkdownReport(report);
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
