import type { HandoffReport, PackageInfo, ResumeItem, ResumeState } from "../types.js";

export function renderMarkdownReport(report: HandoffReport): string {
  const lines: string[] = [
    `# ${titleForTarget(report.target)}`,
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
    ...renderBaseDiffSummary(report),
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
    ...renderResumeSource(report),
    ...renderVerification(report),
    ...renderRisk(report),
    ...renderSecretScanning(report),
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

  if (report.repository.includeDiff && report.repository.baseDiff) {
    lines.splice(
      lines.indexOf("## Included Diff"),
      0,
      `## Included Branch Delta Since \`${report.repository.baseRef}\``,
      codeBlock(report.repository.baseDiff),
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

function titleForTarget(target = "generic") {
  const labels: Record<string, string> = {
    generic: "Handoff Packet",
    codex: "Codex Handoff Packet",
    claude: "Claude Handoff Packet",
    cursor: "Cursor Handoff Packet"
  };

  return labels[target] ?? "Handoff Packet";
}

function renderBaseDiffSummary(report: HandoffReport) {
  if (!report.repository.baseRef) {
    return [];
  }

  return [
    `## Branch Delta Since \`${report.repository.baseRef}\``,
    codeBlock(report.repository.baseDiffSummary || "No committed branch delta detected."),
    ""
  ];
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

function renderResumeSource(report: HandoffReport) {
  if (!report.resumeSource) {
    return [];
  }

  return [
    "## Resume Source",
    `- Source: \`${report.resumeSource.path}\``,
    codeBlock(report.resumeSource.preview),
    "",
    ...renderResumeState(report.resumeSource.state)
  ];
}

function renderResumeState(state: ResumeState | undefined) {
  if (!state) {
    return [];
  }

  return [
    "## Resume State",
    renderResumeItems("Completed", state.completed),
    renderResumeItems("Remaining", state.remaining),
    renderResumeItems("Failed Commands", state.failedCommands),
    renderResumeItems("Open Questions", state.openQuestions),
    renderResumeItems("Verification", state.verification),
    state.nextSafestAction ? `- Next safest action: ${state.nextSafestAction}` : "- Next safest action: none detected.",
    ""
  ];
}

function renderResumeItems(title: string, items: ResumeItem[]) {
  return [`### ${title}`, listOrNone(items.map((item) => `- ${item.text}`))].join("\n");
}

function renderVerification(report: HandoffReport) {
  if (!report.verification) {
    return [];
  }

  return [
    "## Verification",
    report.verification.commands.length > 0
      ? report.verification.commands
          .map((command) =>
            [`- \`${command.command}\` exited ${command.exitCode} in ${command.durationMs}ms`, codeBlock(command.output || "No output.")]
              .join("\n")
          )
          .join("\n\n")
      : "No safe verification scripts detected.",
    ""
  ];
}

function renderRisk(report: HandoffReport) {
  if (!report.risk) {
    return [];
  }

  return [
    "## Risk Notes",
    report.risk.notes.map((note) => `- **${note.severity}**: ${note.title} - ${note.detail}`).join("\n"),
    ""
  ];
}

function renderSecretScanning(report: HandoffReport) {
  if (!report.secretScanning) {
    return [];
  }

  return [
    report.secretScanning.scans ? "## Secret Scan Results" : "## Secret Scanner Availability",
    renderSecretScannerReport(report.secretScanning),
    ""
  ];
}

function renderSecretScannerReport(secretScanning: NonNullable<HandoffReport["secretScanning"]>) {
  if (!secretScanning.scans) {
    return secretScanning.scanners.map((scanner) => `- ${scanner.name}: ${scanner.available ? "available" : "not found"}`).join("\n");
  }

  return secretScanning.scans
    .map((scan) => {
      const lines = [
        `- ${scan.name}: ${scan.ran ? `${scan.findings.length} finding(s), exit ${scan.exitCode}` : scan.error ?? "not run"}`
      ];

      for (const finding of scan.findings) {
        lines.push(`  - ${finding.ruleId ? `${finding.ruleId}: ` : ""}${finding.message}${finding.file ? ` (${finding.file}${finding.line ? `:${finding.line}` : ""})` : ""}`);
      }

      if (scan.truncated) {
        lines.push("  - Additional findings were truncated.");
      }

      return lines.join("\n");
    })
    .join("\n");
}

function codeBlock(text: string) {
  return ["```text", text, "```"].join("\n");
}

function listOrNone(items: string[]) {
  return items.length > 0 ? items.join("\n") : "None detected.";
}
