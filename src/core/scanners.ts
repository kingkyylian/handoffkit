import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative, join } from "node:path";
import { performance } from "node:perf_hooks";

import { execa } from "execa";

import type { SecretFinding, SecretScannerReport, SecretScannerStatus, SecretScanResult } from "../types.js";
import { redactText } from "./redact.js";

const MAX_FINDINGS = 20;
const ERROR_LIMIT = 2000;

export async function detectSecretScanners(): Promise<SecretScannerReport> {
  const [gitleaks, secretlint] = await Promise.all([scannerStatus("gitleaks"), scannerStatus("secretlint")]);
  return { scanners: [gitleaks, secretlint] };
}

export async function runSecretScanners(root: string): Promise<SecretScannerReport> {
  const report = await detectSecretScanners();
  const scans = await Promise.all(report.scanners.map((scanner) => runScanner(root, scanner)));
  return { ...report, scans };
}

export function formatScannerSummary(report: SecretScannerReport): string {
  const availability = report.scanners
    .map((scanner) => `${scanner.name}: ${scanner.available ? "available" : "not found"}`)
    .join("\n");

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

async function scannerStatus(name: "gitleaks" | "secretlint"): Promise<SecretScannerStatus> {
  const result = await execa(name, ["--version"], {
    reject: false
  }).catch(() => undefined);

  return {
    name,
    available: Boolean(result && result.exitCode === 0),
    ...(result?.stdout ? { version: result.stdout.trim() } : {})
  };
}

async function runScanner(root: string, scanner: SecretScannerStatus): Promise<SecretScanResult> {
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

  return scanner.name === "gitleaks" ? runGitleaks(root) : runSecretlint(root);
}

async function runGitleaks(root: string): Promise<SecretScanResult> {
  const started = performance.now();
  const tempDir = await mkdtemp(join(tmpdir(), "handoffkit-gitleaks-"));
  const reportPath = join(tempDir, "report.json");
  const result = await execa(
    "gitleaks",
    ["dir", root, "--no-banner", "--no-color", "--redact=100", "--report-format", "json", "--report-path", reportPath, "--max-target-megabytes", "2"],
    { reject: false, all: true }
  );
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
}

async function runSecretlint(root: string): Promise<SecretScanResult> {
  const started = performance.now();
  const result = await execa("secretlint", ["**/*", "--format", "json", "--no-color"], {
    cwd: root,
    reject: false,
    all: true
  });
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
