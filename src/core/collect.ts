import type { HandoffReport, PackOptions } from "../types.js";
import { collectGitInfo, findGitRoot } from "./git.js";
import { detectInstructionFiles } from "./instructions.js";
import { detectPackageInfo } from "./package-json.js";
import { analyzeRisk } from "./risk.js";
import { detectSecretScanners, runSecretScanners } from "./scanners.js";
import { runVerification } from "./verify.js";

export async function collectHandoffReport(options: PackOptions): Promise<HandoffReport> {
  const root = await findGitRoot(options.cwd);
  const [repository, instructionFiles, packageInfo, secretScanning] = await Promise.all([
    collectGitInfo(root, {
      includeDiff: options.includeDiff && options.includeDiffSummary,
      includeDiffSummary: options.includeDiffSummary,
      ...(options.since ? { since: options.since } : {})
    }),
    detectInstructionFiles(root),
    detectPackageInfo(root),
    options.scanSecrets ? runSecretScanners(root) : detectSecretScanners()
  ]);

  const report: HandoffReport = {
    goal: options.goal,
    target: options.target,
    repository,
    instructionFiles,
    ...(packageInfo ? { packageInfo } : {}),
    ...(options.resumeSource ? { resumeSource: options.resumeSource } : {}),
    ...(options.includeVerification ? { verification: await runVerification(root) } : {}),
    secretScanning,
    budget: {
      requestedTokens: options.budget,
      estimatedTokens: 0,
      wasTrimmed: false
    }
  };

  report.risk = analyzeRisk(report);
  return report;
}
