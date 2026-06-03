/**
 * Template sync script — reads tracker_tasks.yaml and upserts project/phases/tasks.
 * Safe to re-run at any time. Reports created, updated, and unchanged counts.
 * Called by the GitHub Actions sync-template workflow on every push that touches
 * tracker_tasks.yaml. Never triggers an app redeploy.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

interface TaskDef {
  id: string;
  title: string;
}

interface PhaseDef {
  id: string;
  name: string;
  tasks: TaskDef[];
}

interface Template {
  version: number;
  project: string;
  phases: PhaseDef[];
}

interface SyncReport {
  templateVersion: number;
  projectId: string;
  phases: { created: number; updated: number; unchanged: number };
  tasks: { created: number; updated: number; unchanged: number };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const raw = readFileSync(join(process.cwd(), "tracker_tasks.yaml"), "utf8");
  const template = parse(raw) as Template;

  const report: SyncReport = {
    templateVersion: template.version,
    projectId: template.project,
    phases: { created: 0, updated: 0, unchanged: 0 },
    tasks: { created: 0, updated: 0, unchanged: 0 },
  };

  console.log(`\nSyncing template v${template.version} → project: ${template.project}\n`);

  // ── Upsert project ────────────────────────────────────────────────────────
  const existingProject = await db.query.projects.findFirst({
    where: eq(schema.projects.id, template.project),
  });
  await db
    .insert(schema.projects)
    .values({
      id: template.project,
      name: "Project Tracker",
      repository: "https://github.com/swapniljoijode/Project-Tracker",
      templateVersion: template.version,
    })
    .onConflictDoUpdate({
      target: schema.projects.id,
      set: { templateVersion: template.version },
    });
  console.log(`  project  : ${existingProject ? "updated" : "created"} — ${template.project}`);

  // ── Upsert phases and tasks ───────────────────────────────────────────────
  for (const [i, phase] of template.phases.entries()) {
    const existingPhase = await db.query.phases.findFirst({
      where: eq(schema.phases.id, phase.id),
    });

    await db
      .insert(schema.phases)
      .values({ id: phase.id, projectId: template.project, name: phase.name, order: i })
      .onConflictDoUpdate({
        target: schema.phases.id,
        set: { name: phase.name, order: i },
      });

    if (!existingPhase) {
      report.phases.created++;
    } else if (existingPhase.name !== phase.name || existingPhase.order !== i) {
      report.phases.updated++;
    } else {
      report.phases.unchanged++;
    }

    for (const task of phase.tasks) {
      const existingTask = await db.query.tasks.findFirst({
        where: eq(schema.tasks.id, task.id),
      });

      await db
        .insert(schema.tasks)
        .values({ id: task.id, phaseId: phase.id, title: task.title })
        .onConflictDoUpdate({
          target: schema.tasks.id,
          // Never overwrite currentStatus — status is owned by the runtime path
          set: { title: task.title, updatedAt: new Date() },
        });

      if (!existingTask) {
        report.tasks.created++;
      } else if (existingTask.title !== task.title) {
        report.tasks.updated++;
      } else {
        report.tasks.unchanged++;
      }
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(
    `\n  phases   : ${report.phases.created} created, ${report.phases.updated} updated, ${report.phases.unchanged} unchanged`
  );
  console.log(
    `  tasks    : ${report.tasks.created} created, ${report.tasks.updated} updated, ${report.tasks.unchanged} unchanged`
  );
  console.log(`\n✓ Sync complete (template v${report.templateVersion})\n`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
