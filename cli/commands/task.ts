import { Command } from "commander";
import { getConfig } from "../config";
import { getTask, createEvent } from "../api";
import type { TaskStatus } from "../../src/lib/types";

const STATUS_SYMBOL: Record<TaskStatus, string> = {
  ongoing: "●",
  success: "✓",
  failure: "✗",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function taskCommand() {
  const task = new Command("task").description("Manage individual tasks");

  // tracker task start <id>
  task
    .command("start <id>")
    .description('Set a task to "ongoing"')
    .option("-n, --note <text>", "Optional note")
    .action(async (id: string, opts: { note?: string }) => {
      const cfg = getConfig();
      const result = await createEvent(cfg, id, "ongoing", opts.note);
      console.log(`● ${id} → ongoing  (event: ${result.eventId})`);
    });

  // tracker task done <id>
  task
    .command("done <id>")
    .description('Set a task to "success"')
    .option("-n, --note <text>", "Optional note")
    .option("-l, --link <url>", "Link to commit, artifact, or log")
    .action(async (id: string, opts: { note?: string; link?: string }) => {
      const cfg = getConfig();
      const result = await createEvent(cfg, id, "success", opts.note, opts.link);
      console.log(`✓ ${id} → success  (event: ${result.eventId})`);
    });

  // tracker task fail <id>
  task
    .command("fail <id>")
    .description('Set a task to "failure"')
    .option("-n, --note <text>", "Optional note")
    .option("-l, --link <url>", "Link to commit, artifact, or log")
    .action(async (id: string, opts: { note?: string; link?: string }) => {
      const cfg = getConfig();
      const result = await createEvent(cfg, id, "failure", opts.note, opts.link);
      console.log(`✗ ${id} → failure  (event: ${result.eventId})`);
    });

  // tracker task show <id>
  task
    .command("show <id>")
    .description("Show a task and its full event history")
    .action(async (id: string) => {
      const cfg = getConfig();
      const t = await getTask(cfg, id);
      const sym = STATUS_SYMBOL[t.currentStatus];
      console.log(`\n${sym} [${t.currentStatus.toUpperCase()}] ${t.id} — ${t.title}`);
      console.log(`  Phase    : ${t.phaseName} (${t.phaseId})`);
      console.log(`  Updated  : ${formatDate(t.updatedAt)}`);

      if (t.events.length === 0) {
        console.log("  No events recorded yet.\n");
        return;
      }

      console.log("\n  Event history:");
      for (const ev of t.events) {
        const s = STATUS_SYMBOL[ev.status];
        const line = [`  ${s} ${ev.status.padEnd(8)} ${formatDate(ev.createdAt)}`];
        if (ev.note) line.push(`    note: ${ev.note}`);
        if (ev.artifactLink) line.push(`    link: ${ev.artifactLink}`);
        console.log(line.join("\n"));
      }
      console.log();
    });

  return task;
}
