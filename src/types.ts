export type OutputFormat = "markdown" | "json";
export type AgentTarget = "generic" | "codex" | "claude" | "cursor";

export interface PackOptions {
  goal: string;
  cwd: string;
  output?: string;
  format: OutputFormat;
  target: AgentTarget;
  budget: number;
  includeDiff: boolean;
  includeDiffSummary: boolean;
  since?: string;
  includeVerification: boolean;
  scanSecrets: boolean;
  includeCache: boolean;
  resumeSource?: ResumeSource;
}

export interface HandoffReport {
  goal: string;
  target: AgentTarget;
  repository: RepositoryInfo;
  instructionFiles: InstructionFile[];
  packageInfo?: PackageInfo;
  resumeSource?: ResumeSource;
  verification?: VerificationReport;
  cache?: CacheReport;
  risk?: RiskReport;
  secretScanning?: SecretScannerReport;
  budget: BudgetInfo;
}

export interface RepositoryInfo {
  name: string;
  branch: string;
  baseRef?: string;
  status: string;
  recentCommits: string[];
  changedFiles: string[];
  baseDiffSummary?: string;
  stagedDiffSummary: string;
  unstagedDiffSummary: string;
  includeDiff: boolean;
  baseDiff?: string;
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

export interface ResumeSource {
  path: string;
  preview: string;
  state?: ResumeState;
}

export interface ResumeState {
  completed: ResumeItem[];
  remaining: ResumeItem[];
  failedCommands: ResumeItem[];
  openQuestions: ResumeItem[];
  verification: ResumeItem[];
  nextSafestAction?: string;
}

export interface ResumeItem {
  text: string;
  sourceHeading?: string;
}

export type CacheArtifactKind = "verification" | "resume";

export interface CacheArtifactEnvelope<T = unknown> {
  version: 1;
  kind: CacheArtifactKind;
  createdAt: string;
  data: T;
}

export interface CacheArtifactSummary {
  kind: CacheArtifactKind;
  name: string;
  createdAt: string;
  path: string;
}

export interface CacheReport {
  artifacts: CacheArtifactSummary[];
}

export interface VerificationReport {
  commands: VerificationResult[];
}

export interface VerificationResult {
  name: string;
  command: string;
  exitCode: number;
  durationMs: number;
  output: string;
  skipped?: boolean;
  timedOut?: boolean;
}

export interface RiskReport {
  notes: RiskNote[];
}

export interface RiskNote {
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
}

export interface SecretScannerReport {
  scanners: SecretScannerStatus[];
  scans?: SecretScanResult[];
}

export interface SecretScannerStatus {
  name: "gitleaks" | "secretlint";
  available: boolean;
  version?: string;
  configFiles: string[];
  configHint: string;
  installHint: string;
}

export interface SecretScanResult {
  name: "gitleaks" | "secretlint";
  available: boolean;
  ran: boolean;
  exitCode?: number;
  durationMs?: number;
  findings: SecretFinding[];
  error?: string;
  truncated: boolean;
  timedOut?: boolean;
}

export interface SecretFinding {
  ruleId?: string;
  message: string;
  file?: string;
  line?: number;
}
