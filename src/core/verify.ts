import { performance } from "node:perf_hooks";

import { execa } from "execa";

import type { PackageInfo, VerificationReport, VerificationResult, VerificationScript } from "../types.js";
import { detectPackageInfo } from "./package-json.js";

const VERIFY_ORDER = ["typecheck", "lint", "test", "build"];
const OUTPUT_LIMIT = 4000;

export function selectVerificationScripts(packageInfo: PackageInfo | undefined): VerificationScript[] {
  if (!packageInfo) {
    return [];
  }

  return VERIFY_ORDER.flatMap((name) => packageInfo.verificationScripts.filter((script) => script.name === name));
}

export async function runVerification(root: string): Promise<VerificationReport> {
  const packageInfo = await detectPackageInfo(root);
  const scripts = selectVerificationScripts(packageInfo);
  const commands: VerificationResult[] = [];

  for (const script of scripts) {
    commands.push(await runScript(root, packageInfo?.packageManager ?? "npm", script));
  }

  return { commands };
}

async function runScript(root: string, packageManager: string, script: VerificationScript): Promise<VerificationResult> {
  const started = performance.now();
  const command = `${packageManager} run ${script.name}`;
  const result = await execa(packageManager, ["run", script.name], {
    cwd: root,
    reject: false,
    all: true
  });

  return {
    name: script.name,
    command,
    exitCode: result.exitCode ?? 1,
    durationMs: Math.round(performance.now() - started),
    output: trimOutput(result.all ?? result.stdout ?? result.stderr ?? "")
  };
}

function trimOutput(output: string) {
  const normalized = output.trim();
  return normalized.length > OUTPUT_LIMIT ? `${normalized.slice(-OUTPUT_LIMIT)}\n[trimmed]` : normalized;
}
