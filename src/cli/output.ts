import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { applyMarkdownBudget, estimateTokens } from "../core/budget.js";
import { redactText } from "../core/redact.js";
import { renderJsonReport } from "../report/json.js";
import { renderMarkdownReport } from "../report/markdown.js";
import type { HandoffReport, OutputFormat } from "../types.js";

export async function writeRenderedReport(report: HandoffReport, format: OutputFormat, budget: number, output?: string) {
  const rendered = redactText(renderOutput(report, format, budget));

  if (output) {
    const outputPath = resolve(process.cwd(), output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, rendered, "utf8");
    process.stderr.write(`Wrote handoff packet to ${outputPath}\n`);
    return;
  }

  process.stdout.write(rendered);
}

function renderOutput(report: HandoffReport, format: OutputFormat, budget: number) {
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
