#!/usr/bin/env node
import { Command } from "commander";
import { taskCommand } from "./commands/task";
import { phaseCommand } from "./commands/phase";

const program = new Command();

program
  .name("tracker")
  .description("Project Tracker CLI — control the tracker from the terminal or a pipeline")
  .version("0.1.0");

program.addCommand(taskCommand());
program.addCommand(phaseCommand());

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
