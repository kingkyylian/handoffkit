import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { detectInstructionFiles } from "../../src/core/instructions.js";

describe("detectInstructionFiles", () => {
  it("detects instruction files with a redacted compact preview", async () => {
    const root = await makeTempDir();
    await writeFile(join(root, "AGENTS.md"), [
      "# Agents",
      "Run pnpm test before finishing.",
      "OPENAI_API_KEY=sk-test1234567890abcdef"
    ].join("\n"));

    const files = await detectInstructionFiles(root);

    expect(files).toEqual([
      {
        path: "AGENTS.md",
        kind: "agents",
        preview: "# Agents\nRun pnpm test before finishing.\nOPENAI_API_KEY=[REDACTED]"
      }
    ]);
  });
});

async function makeTempDir() {
  const root = join(tmpdir(), `handoffkit-${crypto.randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}
