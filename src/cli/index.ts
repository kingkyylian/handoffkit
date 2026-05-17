#!/usr/bin/env node
import { Command } from "commander";

import { createPackCommand } from "./commands/pack.js";

const program = new Command()
  .name("handoffkit")
  .description("Create safe local handoff packets for AI-assisted coding sessions.")
  .version("0.1.0");

program.addCommand(createPackCommand());

try {
  await program.parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
