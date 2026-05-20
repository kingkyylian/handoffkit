import type { AgentTarget } from "../types.js";

export type ReportSectionKey =
  | "goal"
  | "repository"
  | "gitStatus"
  | "recentCommits"
  | "changedFiles"
  | "branchDelta"
  | "diffSummary"
  | "includedBranchDelta"
  | "includedDiff"
  | "instructionFiles"
  | "package"
  | "resume"
  | "verification"
  | "cache"
  | "risk"
  | "secretScanning";

export interface ReportProfile {
  title: string;
  sectionOrder: ReportSectionKey[];
  nextAgentNotes: string[];
}

const genericOrder: ReportSectionKey[] = [
  "goal",
  "repository",
  "gitStatus",
  "recentCommits",
  "changedFiles",
  "branchDelta",
  "diffSummary",
  "includedBranchDelta",
  "includedDiff",
  "instructionFiles",
  "package",
  "resume",
  "verification",
  "cache",
  "risk",
  "secretScanning"
];

const profiles: Record<AgentTarget, ReportProfile> = {
  generic: {
    title: "Handoff Packet",
    sectionOrder: genericOrder,
    nextAgentNotes: [
      "Use this packet as the starting context for the next coding session.",
      "Verify commands locally before claiming completion."
    ]
  },
  codex: {
    title: "Codex Handoff Packet",
    sectionOrder: [
      "goal",
      "repository",
      "gitStatus",
      "changedFiles",
      "verification",
      "cache",
      "risk",
      "branchDelta",
      "diffSummary",
      "includedBranchDelta",
      "includedDiff",
      "instructionFiles",
      "package",
      "resume",
      "secretScanning",
      "recentCommits"
    ],
    nextAgentNotes: [
      "Start by reading the goal, repository status, changed files, and verification state.",
      "Use local tools to inspect files before editing; do not assume hidden context.",
      "Keep edits scoped and rerun the relevant verification before reporting completion."
    ]
  },
  claude: {
    title: "Claude Code Handoff Packet",
    sectionOrder: [
      "goal",
      "resume",
      "repository",
      "verification",
      "cache",
      "risk",
      "changedFiles",
      "gitStatus",
      "branchDelta",
      "diffSummary",
      "includedBranchDelta",
      "includedDiff",
      "instructionFiles",
      "package",
      "secretScanning",
      "recentCommits"
    ],
    nextAgentNotes: [
      "Treat this as concise project memory plus current branch state.",
      "Use the resume state to separate completed work from remaining work.",
      "Ask for clarification only when the packet leaves a blocking ambiguity."
    ]
  },
  cursor: {
    title: "Cursor Handoff Packet",
    sectionOrder: [
      "goal",
      "repository",
      "changedFiles",
      "gitStatus",
      "includedDiff",
      "diffSummary",
      "branchDelta",
      "includedBranchDelta",
      "instructionFiles",
      "package",
      "verification",
      "cache",
      "risk",
      "resume",
      "secretScanning",
      "recentCommits"
    ],
    nextAgentNotes: [
      "Open the changed files first to build editor context.",
      "Use instruction files and package scripts to keep edits aligned with the workspace.",
      "Prefer small edits and rerun the detected verification scripts."
    ]
  }
};

export function profileForTarget(target: AgentTarget): ReportProfile {
  return profiles[target] ?? profiles.generic;
}
