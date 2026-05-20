import { Command } from "commander";
import { z } from "zod";

import { writeCacheArtifact } from "../../core/cache.js";
import { findGitRoot } from "../../core/git.js";
import { redactText } from "../../core/redact.js";
import { runVerification } from "../../core/verify.js";
import type { VerificationResult } from "../../types.js";

const VerifyOptionsSchema = z.object({
  format: z.enum(["markdown", "json"]).default("markdown"),
  cache: z.boolean().default(false)
});

export function createVerifyCommand() {
  return new Command("verify")
    .description("Run safe local verification scripts.")
    .summary("Run safe detected verification scripts.")
    .option("--format <format>", "output format: markdown or json", "markdown")
    .option("--cache", "write a local verification artifact under .handoffkit/verification")
    .action(async (rawOptions) => {
      const options = VerifyOptionsSchema.parse(rawOptions);
      const root = await findGitRoot(process.cwd());
      const verification = await runVerification(root);

      if (options.cache) {
        const cache = await writeCacheArtifact(root, "verification", verification);
        process.stderr.write(`Wrote verification cache to ${cache.latestPath}\n`);
      }

      if (options.format === "json") {
        process.stdout.write(redactText(`${JSON.stringify(verification, null, 2)}\n`));
        return;
      }

      process.stdout.write(redactText(renderVerificationMarkdown(verification.commands)));
    });
}

function renderVerificationMarkdown(commands: VerificationResult[]) {
  const lines = ["# Verification", ""];

  if (commands.length === 0) {
    lines.push("No safe verification scripts detected.");
  } else {
    for (const command of commands) {
      lines.push(`- \`${command.command}\` exited ${command.exitCode} in ${command.durationMs}ms`);
    }
  }

  return `${lines.join("\n")}\n`;
}
