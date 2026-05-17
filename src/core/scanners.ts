import { execa } from "execa";

import type { SecretScannerReport } from "../types.js";

export async function detectSecretScanners(): Promise<SecretScannerReport> {
  const [gitleaks, secretlint] = await Promise.all([scannerStatus("gitleaks"), scannerStatus("secretlint")]);
  return { scanners: [gitleaks, secretlint] };
}

export function formatScannerSummary(report: SecretScannerReport): string {
  return report.scanners.map((scanner) => `${scanner.name}: ${scanner.available ? "available" : "not found"}`).join("\n");
}

async function scannerStatus(name: "gitleaks" | "secretlint") {
  const result = await execa(name, ["--version"], {
    reject: false
  }).catch(() => undefined);

  return {
    name,
    available: Boolean(result && result.exitCode === 0),
    ...(result?.stdout ? { version: result.stdout.trim() } : {})
  };
}
