/**
 * update-retail-status.ts — brings tracker in sync with the actual repo state
 * as of the full audit on 2026-06-05.
 *
 * Run: npx tsx scripts/update-retail-status.ts
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const REPO = "https://github.com/swapniljoijode/Retail-Fashion-Intelligence";

const NOW_SUCCESS: { id: string; note: string }[] = [
  // P3 — R2 and Snowflake were marked ongoing but are confirmed done
  { id: "P3-1", note: "R2 buckets created; upload_r2.py with S3-compatible credentials confirmed" },
  { id: "P3-2", note: "upload_r2.py uploads Parquet to R2 with boto3; conditional on secrets" },
  { id: "P3-3", note: "Snowflake external stage documented in docs/snowflake_setup.md" },

  // P5 — Orchestration structure confirmed in place
  {
    id: "P5-1",
    note: "Airflow runs via docker/airflow/ Docker Compose; makefile targets airflow-up/init",
  },
  { id: "P5-2", note: "DAG covering full pipeline workflow built in orchestration/dags/" },
  { id: "P5-3", note: "astronomer-cosmos renders dbt as native Airflow tasks" },
  { id: "P5-5", note: "Backfill procedure documented in docs/backfill_procedure.md" },

  // P7 — All CI/CD confirmed (GitHub Actions, not GitLab — architecture updated)
  // P7-1 through P7-5 already success from initial migration — no change needed

  // P8 — Full serving layer confirmed
  {
    id: "P8-1",
    note: "Gold marts exported via ingestion/export_snapshot.py; snapshot uploaded to R2",
  },
  { id: "P8-2", note: "Next.js 14 app with app router, TypeScript, Tailwind built in dashboard/" },
  {
    id: "P8-3",
    note: "Five domain views: Sales, Marketing, Category, Product Planning, Placement",
  },
  { id: "P8-4", note: "vercel.json present; dashboard deployed to Vercel Hobby" },

  // P9 — Docs fully authored
  {
    id: "P9-3",
    note: "MkDocs site complete: architecture.md, observability.md, ci_cd_setup.md, charter.md, metric_dictionary.md, dimensional_model.md, backfill_procedure.md, snowflake_setup.md, index.md",
  },
];

const NOW_ONGOING: { id: string; note: string }[] = [
  {
    id: "P5-4",
    note: "DAG dependencies, retries, and scheduling set; execution verification in progress",
  },
  {
    id: "P9-1",
    note: "Image pipeline using openly licensed sources — deferred to future iteration",
  },
  { id: "P9-2", note: "Elementary scaffolded in observability.md; full integration pending" },
];

async function setStatus(
  db: ReturnType<typeof drizzle<typeof schema>>,
  taskId: string,
  status: "success" | "ongoing",
  note: string
) {
  const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, taskId) });
  if (!task) {
    console.log(`  ⚠  ${taskId} not found`);
    return;
  }
  if (task.currentStatus === status) {
    console.log(`  –  ${taskId} already ${status}`);
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.taskEvents)
      .values({
        id: `audit-${status}-${taskId}`,
        taskId,
        status,
        note,
        artifactLink: REPO,
      })
      .onConflictDoNothing();
    await tx
      .update(schema.tasks)
      .set({ currentStatus: status, updatedAt: new Date() })
      .where(eq(schema.tasks.id, taskId));
  });

  const sym = status === "success" ? "✓" : "●";
  console.log(`  ${sym}  ${taskId} → ${status}`);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("\nUpdating retail project status from full repo audit…\n");

  console.log("Marking as success:");
  for (const t of NOW_SUCCESS) await setStatus(db, t.id, "success", t.note);

  console.log("\nMarking as ongoing:");
  for (const t of NOW_ONGOING) await setStatus(db, t.id, "ongoing", t.note);

  // Print final summary
  const phases = await db.query.phases.findMany({
    where: (p, { eq }) => eq(p.projectId, "fashion-retail-intelligence"),
    orderBy: (p, { asc }) => [asc(p.order)],
  });
  const tasks = await db.query.tasks.findMany();

  console.log("\nFinal status:\n");
  let totalSuccess = 0,
    totalOngoing = 0,
    totalOther = 0;
  for (const phase of phases) {
    const pt = tasks.filter((t) => t.phaseId === phase.id);
    const s = pt.filter((t) => t.currentStatus === "success").length;
    const o = pt.filter((t) => t.currentStatus === "ongoing").length;
    const f = pt.filter((t) => t.currentStatus === "failure").length;
    totalSuccess += s;
    totalOngoing += o;
    totalOther += f + (pt.length - s - o - f);
    const pct = pt.length > 0 ? Math.round((s / pt.length) * 100) : 0;
    console.log(`  ${phase.id.padEnd(3)} ${phase.name.padEnd(45)} ${pct}%  ✓${s} ●${o} ✗${f}`);
  }
  console.log(`\n  Total: ✓${totalSuccess} done  ●${totalOngoing} ongoing  ✗${totalOther} other\n`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
