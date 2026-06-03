import { Command } from "commander";
import { getConfig } from "../config";
import { getPhases } from "../api";
import type { TaskStatus } from "../../src/lib/types";

const STATUS_SYMBOL: Record<TaskStatus, string> = {
  ongoing: "●",
  success: "✓",
  failure: "✗",
};

function bar(success: number, failure: number, total: number, width = 20): string {
  if (total === 0) return " ".repeat(width);
  const done = Math.round((success / total) * width);
  const failed = Math.round((failure / total) * width);
  const remaining = width - done - failed;
  return "█".repeat(done) + "░".repeat(failed) + "·".repeat(Math.max(0, remaining));
}

export function phaseCommand() {
  const phase = new Command("phase").description("Inspect phase progress");

  // tracker phase status [id]
  phase
    .command("status [id]")
    .description("Show task progress for one phase or all phases")
    .option("-p, --project <id>", "Project ID", "project-tracker")
    .action(async (id: string | undefined, opts: { project: string }) => {
      const cfg = getConfig();
      const phases = await getPhases(cfg, opts.project);

      const target = id ? phases.filter((p) => p.id === id) : phases;

      if (target.length === 0) {
        console.error(`No phase found with id "${id}"`);
        process.exit(1);
      }

      console.log(`\nProject: ${opts.project}\n`);

      for (const p of target) {
        const pct = p.total > 0 ? Math.round((p.success / p.total) * 100) : 0;
        const progress = bar(p.success, p.failure, p.total);
        console.log(`  ${p.id.padEnd(4)} ${p.name}`);
        console.log(
          `       [${progress}] ${pct}%  ` +
            `${STATUS_SYMBOL.success}${p.success}  ` +
            `${STATUS_SYMBOL.failure}${p.failure}  ` +
            `${STATUS_SYMBOL.ongoing}${p.ongoing}  ` +
            `total:${p.total}`
        );
      }
      console.log();
    });

  return phase;
}
