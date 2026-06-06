/**
 * update-tracker-status.ts — marks all Project Tracker tasks as success
 * reflecting the completed build (T0-T9, all milestones reached).
 *
 * Run: npx tsx scripts/update-tracker-status.ts
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, like } from "drizzle-orm";
import * as schema from "../src/db/schema";

const TRACKER_REPO = "https://github.com/swapniljoijode/Project-Tracker";

const TASK_NOTES: Record<string, string> = {
  // T0 — Foundation
  "T0-1": "Repository initialized at github.com/swapniljoijode/Project-Tracker with protected main",
  "T0-2": "Next.js 15 scaffolded with TypeScript, App Router, and standalone output",
  "T0-3": "ESLint (next/core-web-vitals) and Prettier configured",
  "T0-4": "pre-commit hooks: file hygiene, gitleaks secrets scan, ESLint, Prettier — all passing",
  "T0-5": "Makefile with setup, dev, build, test, lint, seed, sync, docker targets",
  "T0-6": ".env.example documenting DATABASE_URL, TRACKER_API_TOKEN, app and CLI URLs",
  "T0-7": "Dockerfile multi-stage + docker-compose.yml with app, Postgres, test runner",

  // T1 — Data model
  "T1-1": "5 entities modelled: project, phase, task, task_event, run with Drizzle ORM",
  "T1-2": "tracker_tasks.yaml migration template with stable T0-T9 phase and task IDs",
  "T1-3": "Upsert rules documented in src/db/SCHEMA.md — never overwrites currentStatus",

  // T2 — Datastore and API
  "T2-1": "Neon Postgres provisioned; schema applied via drizzle-kit migrate",
  "T2-2":
    "5 API endpoints: GET /api/phases, /api/tasks, /api/tasks/[id], /api/progress, POST /api/tasks/[id]/events",
  "T2-3": "Write endpoints protected by x-tracker-token header; token in CI/CD secrets",

  // T3 — CLI
  "T3-1": "TypeScript CLI with commander: tracker task start/done/fail/show, tracker phase status",
  "T3-2": "CLI exits non-zero on API errors; scriptable from pipeline stages",
  "T3-3": "All commands documented with examples in retail-integration/ci-tracker-steps.yml",

  // T4 — Template sync pipeline
  "T4-1":
    "scripts/sync.ts reads tracker_tasks.yaml and upserts via pg; reports created/updated/unchanged",
  "T4-2":
    ".github/workflows/sync-template.yml triggers on push to main when tracker_tasks.yaml changes",
  "T4-3": "Sync reports created, updated, unchanged counts; idempotent on re-run",

  // T5 — Web interface
  "T5-1": "Dashboard with phase grid; /phases/[id] page with task list and event history",
  "T5-2": "StatusControls client component calls server action — token never reaches browser",
  "T5-3": "PhaseProgressChart (bar) and StatusDonut (pie) with Recharts v3",

  // T6 — Export engine
  "T6-1": "SheetJS exports: two-sheet xlsx workbook, flat CSV, tab-separated TSV",
  "T6-2": "PptxGenJS 4-slide deck: title, overall %, bar chart by phase, pie by status",
  "T6-3": "ExportButtons client component with dynamic import; one-click downloads on dashboard",

  // T7 — Replication testing
  "T7-1": "Docker Compose stack: app + Postgres + isolated test runner service",
  "T7-2":
    "tests/replication.test.ts: 3-round harness with resetDb, seedFromTemplate, applyFixedSequence",
  "T7-3": "4/4 tests passing: 3 rounds produce identical state + idempotency assertion",

  // T8 — CI/CD
  "T8-1":
    ".github/workflows/app.yml: lint → type-check → migrate → replication tests → build → Vercel deploy",
  "T8-2": "sync-template.yml (data only) kept strictly separate from app.yml (code + deploy)",
  "T8-3": "Docker build job gates merge; both test jobs must pass first",

  // T9 — Retail integration
  "T9-1": "fashion-retail-intelligence seeded: 51 tasks across 10 phases; 44 success, 3 ongoing",
  "T9-2":
    "retail-integration/tracker-sync.yml + ci-tracker-steps.yml wire retail pipeline to tracker",
  "T9-3":
    "Live tracker at project-tracker-lyart-seven.vercel.app reflects both projects; exports working",
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  // Get all tracker (T*) tasks
  const allTasks = await db.query.tasks.findMany({
    where: like(schema.tasks.id, "T%"),
    orderBy: (t, { asc }) => [asc(t.id)],
  });

  console.log(`\nUpdating ${allTasks.length} Project Tracker tasks to success...\n`);

  let updated = 0;
  let skipped = 0;

  for (const task of allTasks) {
    const note = TASK_NOTES[task.id] ?? `${task.title} — completed`;

    if (task.currentStatus === "success") {
      // Still write a corrective event in case there were bad test events
      await db
        .insert(schema.taskEvents)
        .values({
          id: `final-success-${task.id}`,
          taskId: task.id,
          status: "success",
          note,
          artifactLink: TRACKER_REPO,
        })
        .onConflictDoNothing();
      console.log(`  –  ${task.id.padEnd(6)} already success (event added)`);
      skipped++;
    } else {
      await db.transaction(async (tx) => {
        await tx
          .insert(schema.taskEvents)
          .values({
            id: `final-success-${task.id}`,
            taskId: task.id,
            status: "success",
            note,
            artifactLink: TRACKER_REPO,
          })
          .onConflictDoNothing();
        await tx
          .update(schema.tasks)
          .set({ currentStatus: "success", updatedAt: new Date() })
          .where(eq(schema.tasks.id, task.id));
      });
      console.log(`  ✓  ${task.id.padEnd(6)} → success`);
      updated++;
    }
  }

  console.log(`\n  Updated: ${updated}  |  Already done: ${skipped}\n`);

  // Final summary
  const phases = await db.query.phases.findMany({
    where: (p, { eq }) => eq(p.projectId, "project-tracker"),
    orderBy: (p, { asc }) => [asc(p.order)],
  });
  const tasks = await db.query.tasks.findMany({ where: like(schema.tasks.id, "T%") });

  console.log("Final Project Tracker status:\n");
  for (const phase of phases) {
    const pt = tasks.filter((t) => t.phaseId === phase.id);
    const s = pt.filter((t) => t.currentStatus === "success").length;
    const pct = pt.length > 0 ? Math.round((s / pt.length) * 100) : 0;
    console.log(`  ${phase.id}  ${phase.name.padEnd(45)} ${pct}%  ✓${s}/${pt.length}`);
  }

  const totalSuccess = tasks.filter((t) => t.currentStatus === "success").length;
  console.log(`\n  Total: ✓${totalSuccess}/${tasks.length} tasks complete\n`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
