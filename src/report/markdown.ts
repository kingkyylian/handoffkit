import type { HandoffReport, PackageInfo } from "../types.js";

export function renderMarkdownReport(report: HandoffReport): string {
  const lines: string[] = [
    "# Handoff Packet",
    "",
    "## Goal",
    report.goal,
    "",
    "## Repository",
    `- Repository: \`${report.repository.name}\``,
    `- Branch: \`${report.repository.branch}\``,
    `- Changed files: ${report.repository.changedFiles.length}`,
    "",
    "## Git Status",
    codeBlock(report.repository.status || "Clean working tree."),
    "",
    "## Recent Commits",
    listOrNone(report.repository.recentCommits.map((commit) => `- ${commit}`)),
    "",
    "## Changed Files",
    listOrNone(report.repository.changedFiles.map((file) => `- \`${file}\``)),
    "",
    "## Diff Summary",
    "### Staged",
    codeBlock(report.repository.stagedDiffSummary || "No staged diff."),
    "",
    "### Unstaged",
    codeBlock(report.repository.unstagedDiffSummary || "No unstaged diff."),
    "",
    "## Instruction Files",
    renderInstructionFiles(report.instructionFiles),
    "",
    "## Package",
    renderPackage(report.packageInfo),
    "",
    "## Next Agent Notes",
    "- This packet was generated from local git and filesystem state.",
    "- Likely secrets were redacted from generated output.",
    "- No LLM APIs were called."
  ];

  if (report.repository.includeDiff && report.repository.diff) {
    lines.splice(
      lines.indexOf("## Instruction Files"),
      0,
      "## Included Diff",
      "### Staged Patch",
      codeBlock(report.repository.diff.staged || "No staged patch."),
      "",
      "### Unstaged Patch",
      codeBlock(report.repository.diff.unstaged || "No unstaged patch."),
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderPackage(packageInfo: PackageInfo | undefined) {
  if (!packageInfo) {
    return "No package.json detected.";
  }

  const lines = [
    packageInfo.name ? `- Package: \`${packageInfo.name}\`` : undefined,
    packageInfo.packageManager ? `- Package manager: \`${packageInfo.packageManager}\`` : undefined
  ].filter((line): line is string => Boolean(line));

  if (packageInfo.verificationScripts.length > 0) {
    const prefix = packageInfo.packageManager ?? "npm";
    lines.push("- Verification scripts:");
    lines.push(...packageInfo.verificationScripts.map((script) => `  - \`${prefix} ${script.name}\``));
  } else {
    lines.push("- Verification scripts: none detected.");
  }

  return lines.join("\n");
}

function renderInstructionFiles(instructionFiles: HandoffReport["instructionFiles"]) {
  if (instructionFiles.length === 0) {
    return "None detected.";
  }

  return instructionFiles
    .map((file) => [`- \`${file.path}\` (${file.kind})`, codeBlock(file.preview || "No preview available.")].join("\n"))
    .join("\n\n");
}

function codeBlock(text: string) {
  return ["```text", text, "```"].join("\n");
}

function listOrNone(items: string[]) {
  return items.length > 0 ? items.join("\n") : "None detected.";
}
