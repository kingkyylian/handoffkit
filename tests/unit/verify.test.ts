import { access, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runVerification, selectVerificationScripts } from "../../src/core/verify.js";
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

  it("skips verification scripts with unsafe shell commands", async () => {
    const root = await mkdtemp(join(tmpdir(), "handoffkit-verify-"));
    const sentinel = join(root, "keep.txt");
    await writeFile(sentinel, "keep\n", "utf8");
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        packageManager: "npm@10.0.0",
        scripts: {
          test: "rm -rf keep.txt"
        }
      }),
      "utf8"
    );

    const verification = await runVerification(root);

    expect(verification.commands).toEqual([
      expect.objectContaining({
        name: "test",
        command: "npm run test",
        exitCode: 127,
        skipped: true,
        output: expect.stringContaining("Skipped unsafe verification script")
      })
    ]);
    await expect(access(sentinel)).resolves.toBeUndefined();
  });

  it("times out long-running verification scripts", async () => {
    const root = await mkdtemp(join(tmpdir(), "handoffkit-verify-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        packageManager: "npm@10.0.0",
        scripts: {
          test: "node -e \"setTimeout(() => {}, 5000)\""
        }
      }),
      "utf8"
    );

    const verification = await runVerification(root, { timeoutMs: 50 });

    expect(verification.commands).toEqual([
      expect.objectContaining({
        name: "test",
        command: "npm run test",
        exitCode: 124,
        timedOut: true,
        output: expect.stringContaining("timed out")
      })
    ]);
  });
});
