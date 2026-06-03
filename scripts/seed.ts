import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
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

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const raw = readFileSync(join(process.cwd(), "tracker_tasks.yaml"), "utf8");
  const template = parse(raw) as Template;

  const projectId = template.project;

  // Upsert project
  await db
    .insert(schema.projects)
    .values({
      id: projectId,
      name: "Project Tracker",
      repository: "https://github.com/swapniljoijode/Project-Tracker",
      templateVersion: template.version,
    })
    .onConflictDoUpdate({
      target: schema.projects.id,
      set: { templateVersion: template.version },
    });
  console.log(`✓ project: ${projectId}`);

  let created = 0;
  let updated = 0;

  for (const [i, phase] of template.phases.entries()) {
    await db
      .insert(schema.phases)
      .values({ id: phase.id, projectId, name: phase.name, order: i })
      .onConflictDoUpdate({
        target: schema.phases.id,
        set: { name: phase.name, order: i },
      });

    for (const task of phase.tasks) {
      const existing = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, task.id),
      });

      await db
        .insert(schema.tasks)
        .values({ id: task.id, phaseId: phase.id, title: task.title })
        .onConflictDoUpdate({
          target: schema.tasks.id,
          set: { title: task.title, updatedAt: new Date() },
        });

      existing ? updated++ : created++;
    }
  }

  console.log(`✓ phases: ${template.phases.length}`);
  console.log(`✓ tasks: ${created} created, ${updated} updated`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
