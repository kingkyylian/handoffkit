#!/usr/bin/env node
import { Command } from "commander";

import { createPackCommand } from "./commands/pack.js";
import { createResumeCommand } from "./commands/resume.js";
import { createRiskCommand } from "./commands/risk.js";
import { createScanSecretsCommand } from "./commands/scan-secrets.js";
import { createVerifyCommand } from "./commands/verify.js";
import { formatCliError } from "./errors.js";

const program = new Command()
  .name("handoffkit")
  .description("Create safe local handoff packets for AI-assisted coding sessions.")
  .summary("Create local-first AI coding session handoff packets.")
  .showHelpAfterError("(run with --help for usage)")
  .version("0.1.1");

program.addCommand(createPackCommand());
program.addCommand(createVerifyCommand());
program.addCommand(createRiskCommand());
program.addCommand(createScanSecretsCommand());
program.addCommand(createResumeCommand());

try {
  await program.parseAsync(process.argv);
} catch (error) {
  process.stderr.write(`${formatCliError(error)}\n`);
  process.exitCode = 1;
}
