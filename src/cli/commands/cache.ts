import { readFile, writeFile } from "node:fs/promises";

import { Command } from "commander";
import { z } from "zod";

import { importCacheArtifact, listCacheArtifacts, parseCacheArtifactEnvelope, readCacheArtifact } from "../../core/cache.js";
import { findGitRoot } from "../../core/git.js";
import { redactText } from "../../core/redact.js";
import type { CacheArtifactEnvelope, CacheArtifactKind, CacheArtifactSummary } from "../../types.js";

const CacheFormatOptionsSchema = z.object({
  format: z.enum(["markdown", "json"]).default("markdown")
});

const CacheExportOptionsSchema = z.object({
  output: z.string().trim().min(1)
});

const CacheKindSchema = z.enum(["verification", "resume"]);

export function createCacheCommand() {
  return new Command("cache")
    .description("Inspect local .handoffkit cache artifacts.")
    .summary("List and show explicit local cache artifacts.")
    .addCommand(createCacheListCommand())
    .addCommand(createCacheShowCommand())
    .addCommand(createCacheExportCommand())
    .addCommand(createCacheImportCommand());
}

function createCacheListCommand() {
  return new Command("list")
    .description("List local cache artifacts.")
    .option("--format <format>", "output format: markdown or json", "markdown")
    .action(async (rawOptions) => {
      const options = CacheFormatOptionsSchema.parse(rawOptions);
      const root = await findGitRoot(process.cwd());
      const artifacts = await listCacheArtifacts(root);

      if (options.format === "json") {
        process.stdout.write(`${JSON.stringify({ artifacts }, null, 2)}\n`);
        return;
      }

      process.stdout.write(renderCacheListMarkdown(artifacts));
    });
}

function createCacheShowCommand() {
  return new Command("show")
    .description("Show one local cache artifact.")
    .argument("<kind>", "cache kind: verification or resume")
    .argument("[name]", "artifact name, defaults to latest", "latest")
    .option("--format <format>", "output format: markdown or json", "markdown")
    .action(async (kindInput: string, name: string, rawOptions) => {
      const options = CacheFormatOptionsSchema.parse(rawOptions);
      const kind = CacheKindSchema.parse(kindInput);
      const root = await findGitRoot(process.cwd());
      const artifact = await readCacheArtifact(root, kind, name);

      if (options.format === "json") {
        process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
        return;
      }

      process.stdout.write(renderCacheArtifactMarkdown(artifact, kind, name));
    });
}

function createCacheExportCommand() {
  return new Command("export")
    .description("Export one local cache artifact as portable JSON.")
    .argument("<kind>", "cache kind: verification or resume")
    .argument("[name]", "artifact name, defaults to latest", "latest")
    .requiredOption("--output <path>", "write exported artifact to a JSON file")
    .action(async (kindInput: string, name: string, rawOptions) => {
      const options = CacheExportOptionsSchema.parse(rawOptions);
      const kind = CacheKindSchema.parse(kindInput);
      const root = await findGitRoot(process.cwd());
      const artifact = await readCacheArtifact(root, kind, name);

      await writeFile(options.output, redactText(`${JSON.stringify(artifact, null, 2)}\n`), "utf8");
      process.stderr.write(`Exported ${kind}/${name} to ${options.output}\n`);
    });
}

function createCacheImportCommand() {
  return new Command("import")
    .description("Import a portable cache artifact into the current repository cache.")
    .argument("<path>", "portable cache artifact JSON file")
    .action(async (path: string) => {
      const root = await findGitRoot(process.cwd());
      const artifact = parseCacheArtifactEnvelope(await readFile(path, "utf8"), path);
      const cache = await importCacheArtifact(root, artifact);

      process.stderr.write(`Imported ${artifact.kind} cache to ${cache.latestPath}\n`);
    });
}

function renderCacheListMarkdown(artifacts: CacheArtifactSummary[]) {
  const lines = ["# Cache Artifacts", ""];

  if (artifacts.length === 0) {
    lines.push("No cache artifacts found.");
  } else {
    for (const artifact of artifacts) {
      lines.push(`- ${artifact.kind}/${artifact.name} (${artifact.createdAt}) - \`${artifact.path}\``);
    }
  }

  return `${lines.join("\n")}\n`;
}

function renderCacheArtifactMarkdown(artifact: CacheArtifactEnvelope, kind: CacheArtifactKind, name: string) {
  return [
    "# Cache Artifact",
    "",
    `- Artifact: ${kind}/${name}`,
    `- Created: ${artifact.createdAt}`,
    "",
    "```json",
    JSON.stringify(artifact, null, 2),
    "```",
    ""
  ].join("\n");
}
