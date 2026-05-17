import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { detectPackageInfo } from "../../src/core/package-json.js";

describe("detectPackageInfo", () => {
  it("detects pnpm and common verification scripts from package.json", async () => {
    const root = await makeTempDir();
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "demo",
      packageManager: "pnpm@10.0.0",
      scripts: {
        build: "tsup",
        test: "vitest run",
        typecheck: "tsc --noEmit",
        start: "node dist/index.js"
      }
    }));

    const info = await detectPackageInfo(root);

    expect(info).toEqual({
      name: "demo",
      packageManager: "pnpm",
      verificationScripts: [
        { name: "build", command: "tsup" },
        { name: "test", command: "vitest run" },
        { name: "typecheck", command: "tsc --noEmit" }
      ]
    });
  });

  it("falls back to lockfiles when packageManager is absent", async () => {
    const root = await makeTempDir();
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "demo" }));
    await writeFile(join(root, "pnpm-lock.yaml"), "");

    const info = await detectPackageInfo(root);

    expect(info?.packageManager).toBe("pnpm");
  });
});

async function makeTempDir() {
  return mkdtemp(join(tmpdir(), "handoffkit-"));
}
