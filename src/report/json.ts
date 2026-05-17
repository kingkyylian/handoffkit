import type { HandoffReport } from "../types.js";

export function renderJsonReport(report: HandoffReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
