import { describe, expect, it } from "vitest";

import { formatScannerSummary } from "../../src/core/scanners.js";

describe("formatScannerSummary", () => {
  it("summarizes optional secret scanner availability", () => {
    expect(formatScannerSummary({
      scanners: [
        { name: "gitleaks", available: false },
        { name: "secretlint", available: true }
      ]
    })).toContain("secretlint: available");
  });
});
