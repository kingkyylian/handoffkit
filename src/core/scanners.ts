import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative, join } from "node:path";
import { performance } from "node:perf_hooks";

import { execa } from "execa";
import fg from "fast-glob";

import type { SecretFinding, SecretScannerReport, SecretScannerStatus, SecretScanResult } from "../types.js";
import { redactText } from "./redact.js";

const MAX_FINDINGS = 20;
const ERROR_LIMIT = 2000;
const SCANNER_TIMEOUT_MS = 120_000;

export interface SecretScannerRunOptions {
  timeoutMs?: number;
}

export async function detectSecretScanners(root = process.cwd(), options: SecretScannerRunOptions = {}): Promise<SecretScannerReport> {
  const timeoutMs = options.timeoutMs ?? SCANNER_TIMEOUT_MS;
  const statusTimeoutMs = Math.max(timeoutMs, 1000);
  const [gitleaks, secretlint] = await Promise.all([scannerStatus("gitleaks", root, statusTimeoutMs), scannerStatus("secretlint", root, statusTimeoutMs)]);
  return { scanners: [gitleaks, secretlint] };
}

export async function runSecretScanners(root: string, options: SecretScannerRunOptions = {}): Promise<SecretScannerReport> {
  const timeoutMs = options.timeoutMs ?? SCANNER_TIMEOUT_MS;
  const report = await detectSecretScanners(root, { timeoutMs });
  const scans = await Promise.all(report.scanners.map((scanner) => runScanner(root, scanner, timeoutMs)));
  return { ...report, scans };
}

export function formatScannerSummary(report: SecretScannerReport): string {
  const availability = report.scanners.map(formatScannerStatus).join("\n");

  if (!report.scans) {
    return availability;
  }

  const scans = report.scans
    .map((scan) => `${scan.name}: ${scan.ran ? `${scan.findings.length} finding(s)` : scan.error ?? "not run"}`)
    .join("\n");

  return `${availability}\n${scans}`;
}

export function normalizeGitleaksFindings(rawJson: string, limit = MAX_FINDINGS): SecretFinding[] {
  const parsed = safeJson(rawJson);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.slice(0, limit).map((finding) => {
    const ruleId = stringValue(finding.RuleID);
    const file = stringValue(finding.File);
    const line = numberValue(finding.StartLine);

    return {
      ...(ruleId ? { ruleId } : {}),
      message: redactText(stringValue(finding.Description) || "Secret finding"),
      ...(file ? { file } : {}),
      ...(line ? { line } : {})
    };
  });
}

export function normalizeSecretlintFindings(rawJson: string, limit = MAX_FINDINGS, root?: string): SecretFinding[] {
  const parsed = safeJson(rawJson);

  if (!Array.isArray(parsed)) {
    return [];
  }

  const findings: SecretFinding[] = [];

  for (const fileResult of parsed) {
    const messages = Array.isArray(fileResult.messages) ? fileResult.messages : [];

    for (const message of messages) {
      if (findings.length >= limit) {
        return findings;
      }

      const filePath = stringValue(fileResult.filePath);
      const ruleId = stringValue(message.ruleId);
      const line = numberValue(message.line);
      findings.push({
        ...(ruleId ? { ruleId } : {}),
        message: redactText(stringValue(message.message) || "Secret finding"),
        ...(filePath ? { file: root ? relative(root, filePath) || filePath : filePath } : {}),
        ...(line ? { line } : {})
      });
    }
  }

  return findings;
}

async function scannerStatus(name: "gitleaks" | "secretlint", root: string, timeoutMs: number): Promise<SecretScannerStatus> {
  const result = await execa(name, ["--version"], {
    reject: false,
    timeout: timeoutMs
  }).catch(() => undefined);
  const configFiles = await scannerConfigFiles(name, root);

  return {
    name,
    available: Boolean(result && result.exitCode === 0),
    ...(result?.stdout ? { version: result.stdout.trim() } : {}),
    configFiles,
    configHint: configHint(name, configFiles),
    installHint: installHint(name)
  };
}

async function runScanner(root: string, scanner: SecretScannerStatus, timeoutMs: number): Promise<SecretScanResult> {
  if (!scanner.available) {
    return {
      name: scanner.name,
      available: false,
      ran: false,
      findings: [],
      error: "Scanner binary not found.",
      truncated: false
    };
  }

  return scanner.name === "gitleaks" ? runGitleaks(root, timeoutMs) : runSecretlint(root, timeoutMs);
}

async function runGitleaks(root: string, timeoutMs: number): Promise<SecretScanResult> {
  const started = performance.now();
  const tempDir = await mkdtemp(join(tmpdir(), "handoffkit-gitleaks-"));
  const reportPath = join(tempDir, "report.json");
  try {
    const result = await execa(
      "gitleaks",
      ["dir", root, "--no-banner", "--no-color", "--redact=100", "--report-format", "json", "--report-path", reportPath, "--max-target-megabytes", "2"],
      { reject: false, all: true, timeout: timeoutMs }
    );

    if (result.timedOut) {
      return scannerFailureResult("gitleaks", result, started, timeoutMs);
    }

    const rawReport = await readFile(reportPath, "utf8").catch(() => "[]");
    const findings = normalizeGitleaksFindings(rawReport);

    return {
      name: "gitleaks",
      available: true,
      ran: result.exitCode === 0 || result.exitCode === 1,
      exitCode: result.exitCode ?? 1,
      durationMs: Math.round(performance.now() - started),
      findings,
      ...(result.exitCode && result.exitCode > 1 ? { error: redactText(trimError(result.all ?? result.stderr ?? "")) } : {}),
      truncated: countJsonArray(rawReport) > findings.length
    };
  } catch (error) {
    return scannerFailureResult("gitleaks", error, started, timeoutMs);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function runSecretlint(root: string, timeoutMs: number): Promise<SecretScanResult> {
  const started = performance.now();
  try {
    const result = await execa("secretlint", ["**/*", "!node_modules/**", "!dist/**", "!coverage/**", "!.git/**", "!.handoffkit/**", "--format", "json", "--no-color"], {
      cwd: root,
      reject: false,
      all: true,
      timeout: timeoutMs
    });

    if (result.timedOut) {
      return scannerFailureResult("secretlint", result, started, timeoutMs);
    }

    const rawOutput = result.stdout || result.all || "[]";
    const findings = normalizeSecretlintFindings(rawOutput, MAX_FINDINGS, root);

    return {
      name: "secretlint",
      available: true,
      ran: result.exitCode === 0 || result.exitCode === 1,
      exitCode: result.exitCode ?? 1,
      durationMs: Math.round(performance.now() - started),
      findings,
      ...(result.exitCode && result.exitCode > 1 ? { error: redactText(trimError(result.all ?? result.stderr ?? "")) } : {}),
      truncated: countSecretlintMessages(rawOutput) > findings.length
    };
  } catch (error) {
    return scannerFailureResult("secretlint", error, started, timeoutMs);
  }
}

function safeJson(rawJson: string): unknown {
  try {
    return JSON.parse(rawJson || "[]");
  } catch {
    return [];
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function countJsonArray(rawJson: string) {
  const parsed = safeJson(rawJson);
  return Array.isArray(parsed) ? parsed.length : 0;
}

function countSecretlintMessages(rawJson: string) {
  const parsed = safeJson(rawJson);

  if (!Array.isArray(parsed)) {
    return 0;
  }

  return parsed.reduce((count, fileResult) => {
    return count + (Array.isArray(fileResult.messages) ? fileResult.messages.length : 0);
  }, 0);
}

function trimError(output: string) {
  const trimmed = output.trim();
  return trimmed.length > ERROR_LIMIT ? `${trimmed.slice(0, ERROR_LIMIT)}\n[truncated]` : trimmed;
}

function scannerFailureResult(name: "gitleaks" | "secretlint", error: unknown, started: number, timeoutMs: number): SecretScanResult {
  const execaError = error as { all?: string; stdout?: string; stderr?: string; timedOut?: boolean; exitCode?: number; shortMessage?: string; message?: string };
  const timedOut = Boolean(execaError.timedOut);
  const rawOutput = execaError.all ?? execaError.stderr ?? execaError.stdout ?? execaError.shortMessage ?? execaError.message ?? String(error);
  const errorOutput = timedOut ? [rawOutput.trim(), `Scanner timed out after ${timeoutMs}ms.`].filter(Boolean).join("\n") : rawOutput;

  return {
    name,
    available: true,
    ran: false,
    exitCode: timedOut ? 124 : execaError.exitCode ?? 1,
    durationMs: Math.round(performance.now() - started),
    findings: [],
    error: redactText(trimError(errorOutput)),
    truncated: false,
    ...(timedOut ? { timedOut: true } : {})
  };
}

function formatScannerStatus(scanner: SecretScannerStatus) {
  const config = scanner.configFiles.length > 0 ? `; config: ${scanner.configFiles.join(", ")}` : scanner.available ? "" : `; ${scanner.configHint}`;
  const install = scanner.available ? "" : `; ${scanner.installHint}`;
  return `${scanner.name}: ${scanner.available ? "available" : "not found"}${config}${install}`;
}

async function scannerConfigFiles(name: "gitleaks" | "secretlint", root: string) {
  const patterns =
    name === "gitleaks"
      ? ["gitleaks.toml", ".gitleaks.toml", ".gitleaksignore", ".config/gitleaks/*.toml"]
      : [".secretlintrc", ".secretlintrc.*", "secretlint.config.*"];

  const matches = await fg(patterns, {
    cwd: root,
    dot: true,
    onlyFiles: true,
    unique: true
  });

  return matches.sort();
}

function configHint(name: "gitleaks" | "secretlint", configFiles: string[]) {
  if (configFiles.length > 0) {
    return `config: ${configFiles.join(", ")}`;
  }

  return name === "gitleaks"
    ? "config: none detected; optional files include .gitleaks.toml, gitleaks.toml, or .config/gitleaks/*.toml"
    : "config: none detected; optional files include .secretlintrc.*, .secretlintrc, or secretlint.config.*";
}

function installHint(name: "gitleaks" | "secretlint") {
  return name === "gitleaks"
    ? "Install gitleaks from https://github.com/gitleaks/gitleaks, then rerun with --scan-secrets."
    : "Install secretlint from https://github.com/secretlint/secretlint, then rerun with --scan-secrets.";
}
