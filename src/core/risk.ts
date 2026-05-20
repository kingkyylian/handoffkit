import type { HandoffReport, RiskReport, RiskNote } from "../types.js";

interface RiskRule {
  severity: RiskNote["severity"];
  title: string;
  detail: string;
  matches: (file: string) => boolean;
}

const RISK_RULES: RiskRule[] = [
  {
    severity: "high",
    title: "Security-sensitive code changed",
    detail: "Review redaction, auth, token, or secret-handling changes carefully before handoff.",
    matches: (file) => /(^|\/)(redact|secret|auth|token|security)/i.test(file)
  },
  {
    severity: "high",
    title: "Release or package publishing path changed",
    detail: "Release and package changes can break install, provenance, or publish flow; run pnpm pack:dry-run and pnpm smoke:release before tagging or publishing.",
    matches: isReleaseOrPackageFile
  },
  {
    severity: "medium",
    title: "CI workflow changed",
    detail: "Workflow changes can fail only after push; confirm GitHub Actions still passes on the target branch.",
    matches: (file) => file.startsWith(".github/workflows/")
  },
  {
    severity: "medium",
    title: "Build tooling or TypeScript config changed",
    detail: "Tooling changes can break typecheck, lint, build output, or package entrypoints; run the full local check command.",
    matches: isBuildToolingFile
  },
  {
    severity: "medium",
    title: "CLI behavior changed",
    detail: "CLI entrypoint or command changes can break user-facing flags and output contracts; cover the changed command with unit or integration tests.",
    matches: (file) => file.startsWith("src/cli/")
  },
  {
    severity: "medium",
    title: "Resume parsing changed",
    detail: "Resume parser changes can drop handoff context; verify completed work, next steps, failures, and open questions are still extracted.",
    matches: (file) => file === "src/core/resume.ts" || file.includes("/resume")
  },
  {
    severity: "medium",
    title: "Handoff report rendering changed",
    detail: "Report rendering changes can hide critical context; verify Markdown and JSON output still include repository, verification, risk, and next-step sections.",
    matches: (file) => file.startsWith("src/report/")
  },
  {
    severity: "medium",
    title: "Generated artifact or ignore policy changed",
    detail: "Ignore/cache policy changes can pollute changedFiles or published packages; verify generated directories remain ignored and excluded from reports.",
    matches: isGeneratedOrIgnorePolicyFile
  },
  {
    severity: "low",
    title: "Documentation changed",
    detail: "Documentation-only changes still need examples, command names, and release instructions checked against the current CLI behavior.",
    matches: isDocumentationFile
  }
];

export function analyzeRisk(report: HandoffReport): RiskReport {
  const files = report.repository.changedFiles;
  const notes: RiskNote[] = [];

  for (const rule of RISK_RULES) {
    if (files.some(rule.matches)) {
      notes.push({
        severity: rule.severity,
        title: rule.title,
        detail: rule.detail
      });
    }
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

function isReleaseOrPackageFile(file: string) {
  return (
    file === "package.json" ||
    file === "CHANGELOG.md" ||
    file === "docs/RELEASE.md" ||
    file === "scripts/release-smoke.mjs" ||
    /^\.github\/workflows\/.*release.*\.ya?ml$/i.test(file) ||
    /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?)$/i.test(file)
  );
}

function isBuildToolingFile(file: string) {
  return (
    /(^|\/)(tsconfig(?:\.[^/]*)?\.json|tsup\.config\.ts|vitest\.config\.ts|eslint\.config\.[cm]?[jt]s|pnpm-workspace\.yaml)$/i.test(file) ||
    file.startsWith("scripts/")
  );
}

function isGeneratedOrIgnorePolicyFile(file: string) {
  return (
    file === ".gitignore" ||
    file === ".npmignore" ||
    file.startsWith(".handoffkit/") ||
    file.startsWith("docs/checkpoints/") ||
    /(^|\/)(dist|coverage|node_modules|\.tmp-tests)\//.test(file)
  );
}

function isDocumentationFile(file: string) {
  return file === "README.md" || file === "ROADMAP.md" || file === "CONTRIBUTING.md" || file === "SECURITY.md" || file.startsWith("docs/");
}
