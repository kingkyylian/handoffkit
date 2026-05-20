import { Command } from "commander";
import { z } from "zod";

import { listCacheArtifacts, readCacheArtifact } from "../../core/cache.js";
import { findGitRoot } from "../../core/git.js";
import type { CacheArtifactEnvelope, CacheArtifactKind, CacheArtifactSummary } from "../../types.js";

const CacheFormatOptionsSchema = z.object({
  format: z.enum(["markdown", "json"]).default("markdown")
});

const CacheKindSchema = z.enum(["verification", "resume"]);

export function createCacheCommand() {
  return new Command("cache")
    .description("Inspect local .handoffkit cache artifacts.")
    .summary("List and show explicit local cache artifacts.")
    .addCommand(createCacheListCommand())
    .addCommand(createCacheShowCommand());
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
