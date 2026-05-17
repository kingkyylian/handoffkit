import { readFile, stat } from "node:fs/promises";

import fg from "fast-glob";

import type { InstructionFile } from "../types.js";
import { redactText } from "./redact.js";

const INSTRUCTION_PATTERNS = [
  "**/AGENTS.md",
  "**/CLAUDE.md",
  "**/GEMINI.md",
  ".cursor/rules",
  ".cursor/rules/**/*",
  ".github/copilot-instructions.md"
];

const PREVIEW_CHAR_LIMIT = 1200;

export async function detectInstructionFiles(root: string): Promise<InstructionFile[]> {
  const paths = await fg(INSTRUCTION_PATTERNS, {
    cwd: root,
    dot: true,
    onlyFiles: false,
    unique: true,
    ignore: ["**/.git/**", "**/node_modules/**", "**/dist/**", "**/coverage/**"]
  });

  return Promise.all(paths.sort().map((path) => instructionFile(root, path)));
}

async function instructionFile(root: string, path: string): Promise<InstructionFile> {
  return {
    path,
    kind: instructionKind(path),
    preview: await readPreview(root, path)
  };
}

async function readPreview(root: string, path: string) {
  const fullPath = `${root}/${path}`;
  const metadata = await stat(fullPath);

  if (!metadata.isFile()) {
    return "Directory rule set detected.";
  }

  const content = await readFile(fullPath, "utf8");
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const preview =
    normalized.length > PREVIEW_CHAR_LIMIT ? `${normalized.slice(0, PREVIEW_CHAR_LIMIT).trimEnd()}\n[truncated]` : normalized;

  return redactText(preview);
}

function instructionKind(path: string): InstructionFile["kind"] {
  if (path.endsWith("AGENTS.md")) {
    return "agents";
  }

  if (path.endsWith("CLAUDE.md")) {
    return "claude";
  }

  if (path.endsWith("GEMINI.md")) {
    return "gemini";
  }

  if (path === ".cursor/rules" || path.startsWith(".cursor/rules/")) {
    return "cursor";
  }

  if (path === ".github/copilot-instructions.md") {
    return "copilot";
  }

  return "instruction";
}
