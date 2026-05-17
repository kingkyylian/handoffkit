import type { HandoffReport, RiskReport, RiskNote } from "../types.js";

export function analyzeRisk(report: HandoffReport): RiskReport {
  const files = report.repository.changedFiles;
  const notes: RiskNote[] = [];

  if (files.some((file) => /(^|\/)(redact|secret|auth|token|security)/i.test(file))) {
    notes.push({
      severity: "high",
      title: "Security-sensitive code changed",
      detail: "Review redaction, auth, token, or secret-handling changes carefully before handoff."
    });
  }

  if (files.some((file) => file === "package.json" || file.endsWith("-lock.yaml") || file.endsWith("lock.json"))) {
    notes.push({
      severity: "medium",
      title: "Dependency or package metadata changed",
      detail: "Run install/build verification and check package publishing metadata."
    });
  }

  if (files.some((file) => file.startsWith(".github/workflows/"))) {
    notes.push({
      severity: "medium",
      title: "CI workflow changed",
      detail: "Confirm GitHub Actions still passes after push."
    });
  }

  const sourceFiles = files.filter((file) => file.startsWith("src/") && file.endsWith(".ts"));
  const testFiles = files.filter((file) => file.startsWith("tests/") && file.endsWith(".test.ts"));

  if (sourceFiles.length > 0 && testFiles.length === 0) {
    notes.push({
      severity: "medium",
      title: "Source changed without matching tests",
      detail: `Review test coverage for ${sourceFiles.slice(0, 5).join(", ")}.`
    });
  }

  if (notes.length === 0) {
    notes.push({
      severity: "low",
      title: "No obvious local risk signals",
      detail: "No deterministic risk rule matched the current changed file set."
    });
  }

  return { notes };
}
