import { performance } from "node:perf_hooks";

import { execa } from "execa";

import type { PackageInfo, VerificationReport, VerificationResult, VerificationScript } from "../types.js";
import { detectPackageInfo } from "./package-json.js";

const VERIFY_ORDER = ["typecheck", "lint", "test", "build"];
const OUTPUT_LIMIT = 4000;
const DEFAULT_TIMEOUT_MS = 120_000;

export interface VerificationRunOptions {
  timeoutMs?: number;
}

export function selectVerificationScripts(packageInfo: PackageInfo | undefined): VerificationScript[] {
  if (!packageInfo) {
    return [];
  }

  return VERIFY_ORDER.flatMap((name) => packageInfo.verificationScripts.filter((script) => script.name === name));
}

export async function runVerification(root: string, options: VerificationRunOptions = {}): Promise<VerificationReport> {
  const packageInfo = await detectPackageInfo(root);
  const scripts = selectVerificationScripts(packageInfo);
  const commands: VerificationResult[] = [];

  for (const script of scripts) {
    commands.push(await runScript(root, packageInfo?.packageManager ?? "npm", script, options.timeoutMs ?? DEFAULT_TIMEOUT_MS));
  }

  return { commands };
}

async function runScript(root: string, packageManager: string, script: VerificationScript, timeoutMs: number): Promise<VerificationResult> {
  const started = performance.now();
  const command = `${packageManager} run ${script.name}`;

  const unsafeReason = unsafeVerificationReason(script.command);
  if (unsafeReason) {
    return {
      name: script.name,
      command,
      exitCode: 127,
      durationMs: Math.round(performance.now() - started),
      output: `Skipped unsafe verification script: ${unsafeReason}.`,
      skipped: true
    };
  }

  try {
    const result = await execa(packageManager, ["run", script.name], {
      cwd: root,
      reject: false,
      all: true,
      timeout: timeoutMs
    });

    const timedOut = Boolean(result.timedOut);
    const output = timedOut
      ? joinOutput(result.all ?? result.stdout ?? result.stderr ?? "", `Verification script timed out after ${timeoutMs}ms.`)
      : result.all ?? result.stdout ?? result.stderr ?? "";

    return {
      name: script.name,
      command,
      exitCode: timedOut ? 124 : result.exitCode ?? 1,
      durationMs: Math.round(performance.now() - started),
      output: trimOutput(output),
      ...(timedOut ? { timedOut: true } : {})
    };
  } catch (error) {
    const execaError = error as { all?: string; stdout?: string; stderr?: string; timedOut?: boolean; exitCode?: number };
    const timedOut = Boolean(execaError.timedOut);
    const output = timedOut
      ? joinOutput(execaError.all ?? execaError.stdout ?? execaError.stderr ?? "", `Verification script timed out after ${timeoutMs}ms.`)
      : execaError.all ?? execaError.stdout ?? execaError.stderr ?? String(error);

    return {
      name: script.name,
      command,
      exitCode: timedOut ? 124 : execaError.exitCode ?? 1,
      durationMs: Math.round(performance.now() - started),
      output: trimOutput(output),
      ...(timedOut ? { timedOut: true } : {})
    };
  }
}

function trimOutput(output: string) {
  const normalized = output.trim();
  return normalized.length > OUTPUT_LIMIT ? `${normalized.slice(-OUTPUT_LIMIT)}\n[trimmed]` : normalized;
}

function joinOutput(output: string, note: string) {
  return [output.trim(), note].filter(Boolean).join("\n");
}

function unsafeVerificationReason(command: string) {
  const patterns: Array<[RegExp, string]> = [
    [/\brm\s+-[^\n;&|]*[rf][^\n;&|]*\b/i, "contains recursive or force removal"],
    [/\bgit\s+(?:reset|clean)\b/i, "contains destructive git command"],
    [/\b(?:npm|pnpm|yarn|bun)\s+publish\b/i, "contains package publishing"],
    [/\bsudo\b/i, "requires elevated privileges"],
    [/\bchmod\s+-R\b/i, "contains recursive chmod"],
    [/\b(?:curl|wget)\b[^\n]*(?:\|\s*(?:sh|bash|zsh|node)|>\s*)/i, "downloads or pipes remote content"]
  ];

  return patterns.find(([pattern]) => pattern.test(command))?.[1];
}
