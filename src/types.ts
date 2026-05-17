export type OutputFormat = "markdown" | "json";

export interface PackOptions {
  goal: string;
  cwd: string;
  output?: string;
  format: OutputFormat;
  budget: number;
  includeDiff: boolean;
  includeDiffSummary: boolean;
}

export interface HandoffReport {
  goal: string;
  repository: RepositoryInfo;
  instructionFiles: InstructionFile[];
  packageInfo?: PackageInfo;
  budget: BudgetInfo;
}

export interface RepositoryInfo {
  name: string;
  branch: string;
  status: string;
  recentCommits: string[];
  changedFiles: string[];
  stagedDiffSummary: string;
  unstagedDiffSummary: string;
  includeDiff: boolean;
  diff?: DiffInfo;
}

export interface DiffInfo {
  staged: string;
  unstaged: string;
}

export interface InstructionFile {
  path: string;
  kind: "agents" | "claude" | "gemini" | "cursor" | "copilot" | "instruction";
  preview: string;
}

export interface PackageInfo {
  name?: string;
  packageManager?: string;
  verificationScripts: VerificationScript[];
}

export interface VerificationScript {
  name: string;
  command: string;
}

export interface BudgetInfo {
  requestedTokens: number;
  estimatedTokens: number;
  wasTrimmed: boolean;
}
