import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import type { HandoffReport, VerificationResult } from "../types.js";
import { redactText } from "./redact.js";

const DEFAULT_CHECKPOINT_DIR = "docs/checkpoints";

export function checkpointFilename(now: Date): string {
  return `${checkpointDateStamp(now)}.md`;
}

export function renderCheckpointMarkdown(report: HandoffReport, now: Date, outputDir = DEFAULT_CHECKPOINT_DIR): string {
  const latestPath = `${outputDir.replace(/\/+$/, "")}/LATEST.md`;
  const lines = [
    `# Project Checkpoint - ${checkpointDisplayDate(now)}`,
    "",
    "## Project",
    `- Repository: \`${report.repository.name}\``,
    `- Branch: \`${report.repository.branch}\``,
    `- Goal: ${report.goal}`,
    `- Target: \`${report.target}\``,
    "",
    "## Current State",
    codeBlock(report.repository.status || "Clean working tree."),
    "",
    "## Important Files / Artifacts",
    renderChangedFiles(report.repository.changedFiles),
    "",
    "## Verification",
    renderVerification(report.verification?.commands),
    "",
    "## Open Questions / Risks",
    renderRisk(report),
    "",
    "## Next Steps",
    "1. Read this checkpoint and the project instructions before editing.",
    "2. Review the listed changed files and current git status.",
    "3. Run the closest relevant verification before marking follow-up work complete.",
    "",
    "## Resume Prompt",
    `Continue from this checkpoint with \`handoffkit resume ${latestPath} --goal "${escapeInline(report.goal)}"\`.`,
    ""
  ];

  return `${lines.join("\n")}\n`;
}

export async function writeCheckpointFiles(root: string, outputDir: string, markdown: string, now: Date) {
  const checkpointDir = checkpointDirectory(root, outputDir);
  const checkpointPath = join(checkpointDir, checkpointFilename(now));
  const latestPath = join(checkpointDir, "LATEST.md");
  const contents = redactText(markdown);

  await mkdir(checkpointDir, { recursive: true });
  await Promise.all([writeFile(checkpointPath, contents, "utf8"), writeFile(latestPath, contents, "utf8")]);

  return { checkpointPath, latestPath };
}

function checkpointDirectory(root: string, outputDir: string) {
  return isAbsolute(outputDir) ? outputDir : resolve(root, outputDir);
}

function checkpointDateStamp(now: Date) {
  const year = now.getUTCFullYear();
  const month = pad(now.getUTCMonth() + 1);
  const day = pad(now.getUTCDate());
  const hour = pad(now.getUTCHours());
  const minute = pad(now.getUTCMinutes());

  return `${year}-${month}-${day}-${hour}${minute}`;
}

function checkpointDisplayDate(now: Date) {
  const year = now.getUTCFullYear();
  const month = pad(now.getUTCMonth() + 1);
  const day = pad(now.getUTCDate());
  const hour = pad(now.getUTCHours());
  const minute = pad(now.getUTCMinutes());

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function renderChangedFiles(changedFiles: string[]) {
  if (changedFiles.length === 0) {
    return "None detected.";
  }

  return changedFiles.map((file) => `- \`${file}\``).join("\n");
}

function renderVerification(commands: VerificationResult[] | undefined) {
  if (!commands) {
    return "- Command: not run";
  }

  if (commands.length === 0) {
    return "- No safe verification scripts detected.";
  }

  return commands
    .map((command) => `- \`${command.command}\` exited ${command.exitCode} in ${command.durationMs}ms`)
    .join("\n");
}

function renderRisk(report: HandoffReport) {
  if (!report.risk || report.risk.notes.length === 0) {
    return "- None recorded.";
  }

  return report.risk.notes.map((note) => `- **${note.severity}**: ${note.title} - ${note.detail}`).join("\n");
}

function codeBlock(text: string) {
  return ["```text", text, "```"].join("\n");
}

function escapeInline(text: string) {
  return text.replace(/"/g, '\\"');
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}
