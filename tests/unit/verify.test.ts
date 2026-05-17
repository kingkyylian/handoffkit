import { describe, expect, it } from "vitest";

import { selectVerificationScripts } from "../../src/core/verify.js";
import type { PackageInfo } from "../../src/types.js";

describe("selectVerificationScripts", () => {
  it("chooses safe verification scripts in a stable order", () => {
    const packageInfo: PackageInfo = {
      name: "demo",
      packageManager: "pnpm",
      verificationScripts: [
        { name: "build", command: "tsup" },
        { name: "check", command: "pnpm typecheck && pnpm lint && pnpm test && pnpm build" },
        { name: "test", command: "vitest run" },
        { name: "lint", command: "eslint ." },
        { name: "typecheck", command: "tsc --noEmit" }
      ]
    };

    expect(selectVerificationScripts(packageInfo).map((script) => script.name)).toEqual([
      "typecheck",
      "lint",
      "test",
      "build"
    ]);
  });
});
