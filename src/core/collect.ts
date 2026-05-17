import type { HandoffReport, PackOptions } from "../types.js";
import { collectGitInfo, findGitRoot } from "./git.js";
import { detectInstructionFiles } from "./instructions.js";
import { detectPackageInfo } from "./package-json.js";

export async function collectHandoffReport(options: PackOptions): Promise<HandoffReport> {
  const root = await findGitRoot(options.cwd);
  const [repository, instructionFiles, packageInfo] = await Promise.all([
    collectGitInfo(root, {
      includeDiff: options.includeDiff && options.includeDiffSummary,
      includeDiffSummary: options.includeDiffSummary
    }),
    detectInstructionFiles(root),
    detectPackageInfo(root)
  ]);

  return {
    goal: options.goal,
    repository,
    instructionFiles,
    ...(packageInfo ? { packageInfo } : {}),
    budget: {
      requestedTokens: options.budget,
      estimatedTokens: 0,
      wasTrimmed: false
    }
  };
}
