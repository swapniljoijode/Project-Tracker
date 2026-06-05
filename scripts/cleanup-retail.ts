/**
 * cleanup-retail.ts — removes duplicate lowercase p0-p9 phases and their
 * tasks/events that were created by a prior seeding, and corrects the
 * project registration (name, repository, templateVersion).
 *
 * Run once: npx tsx scripts/cleanup-retail.ts
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { inArray, eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const LOWERCASE_PHASE_IDS = ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  // 1. Find all tasks in the lowercase phases
  const dupTasks = await db.query.tasks.findMany({
    where: (t, { inArray }) => inArray(t.phaseId, LOWERCASE_PHASE_IDS),
  });
  const dupTaskIds = dupTasks.map((t) => t.id);

  console.log(`\nFound ${dupTasks.length} duplicate tasks in lowercase phases.`);

  // 2. Delete their events
  if (dupTaskIds.length > 0) {
    const deleted = await db
      .delete(schema.taskEvents)
      .where(inArray(schema.taskEvents.taskId, dupTaskIds));
    console.log(`  Deleted task events for duplicate tasks.`);
  }

  // 3. Delete the duplicate tasks
  if (dupTaskIds.length > 0) {
    await db.delete(schema.tasks).where(inArray(schema.tasks.id, dupTaskIds));
    console.log(`  Deleted ${dupTaskIds.length} duplicate tasks.`);
  }

  // 4. Delete the duplicate phases
  await db.delete(schema.phases).where(inArray(schema.phases.id, LOWERCASE_PHASE_IDS));
  console.log(`  Deleted ${LOWERCASE_PHASE_IDS.length} duplicate lowercase phases.`);

  // 5. Fix the project registration (correct name, repo, version)
  await db
    .update(schema.projects)
    .set({
      name: "Fashion Retail Intelligence Platform",
      repository: "https://github.com/swapniljoijode/Retail-Fashion-Intelligence",
      templateVersion: 1,
    })
    .where(eq(schema.projects.id, "fashion-retail-intelligence"));
  console.log(`  Fixed project registration: name, repository, templateVersion=1.`);

  // 6. Verify
  const remainingPhases = await db.query.phases.findMany({
    where: (p, { eq }) => eq(p.projectId, "fashion-retail-intelligence"),
    orderBy: (p, { asc }) => [asc(p.order)],
  });
  const remainingTasks = await db.query.tasks.findMany();
  const retailTasks = remainingTasks.filter((t) => remainingPhases.some((p) => p.id === t.phaseId));

  console.log(`\nAfter cleanup:`);
  console.log(`  Phases : ${remainingPhases.length} (expected 10)`);
  console.log(`  Tasks  : ${retailTasks.length} (expected 51)`);
  remainingPhases.forEach((p) => {
    const pTasks = retailTasks.filter((t) => t.phaseId === p.id);
    const success = pTasks.filter((t) => t.currentStatus === "success").length;
    const ongoing = pTasks.filter((t) => t.currentStatus === "ongoing").length;
    console.log(`    ${p.id} ${p.name}: ${pTasks.length} tasks (✓${success} ●${ongoing})`);
  });

  console.log("\n✓ Cleanup complete.\n");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
