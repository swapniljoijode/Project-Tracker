/**
 * mark-completed.ts — one-time script to mark retail project tasks that are
 * already done based on current repo state (run once after initial seeding).
 *
 * Run: npx tsx retail-integration/mark-completed.ts
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const COMPLETED_TASKS = [
  // P0: Foundation — fully complete (repo exists, CI live, Makefile, pre-commit, .env)
  {
    id: "P0-1",
    note: "Monorepo initialized at github.com/swapniljoijode/Retail-Fashion-Intelligence",
  },
  { id: "P0-2", note: "uv environment configured with pyproject.toml and uv.lock" },
  { id: "P0-3", note: "pre-commit configured with ruff, black, sqlfluff" },
  { id: "P0-4", note: "Makefile present at repo root" },
  { id: "P0-5", note: ".env.example and python-dotenv configured" },
  { id: "P0-6", note: "Fashion_Retail_Intelligence_Project_Plan.md authored" },
  { id: "P0-7", note: "tracker_tasks.yaml authored and seeded into Project Tracker" },

  // P1: Dimensional Model — complete (dbt project has dim/fct/stg/int models)
  { id: "P1-1", note: "Business questions documented in project plan across five marts" },
  {
    id: "P1-2",
    note: "Conformed dimensions designed: dim_customer, dim_product, dim_supplier, dim_date, dim_region",
  },
  {
    id: "P1-3",
    note: "Fact tables designed with grain: fct_orders, fct_inventory_snapshot, fct_supplier_performance",
  },
  { id: "P1-4", note: "Metric dictionary authored in project documentation" },
  { id: "P1-5", note: "ERD produced in architecture/ directory" },
  { id: "P1-6", note: "Model reviewed against business questions" },

  // P2: Synthetic data — complete (data_generation/ present, generators built)
  { id: "P2-1", note: "Dimension generators built with Faker in data_generation/" },
  { id: "P2-2", note: "Fact generators with seasonality built — 2M+ order records" },
  { id: "P2-3", note: "Volume configurable via workflow_dispatch input (test/small/large)" },
  { id: "P2-4", note: "Controlled dirtiness injected into dataset" },
  { id: "P2-5", note: "Outputs written as date-partitioned Parquet" },
  { id: "P2-6", note: "Generators covered with pytest (CI unit tests pass)" },

  // P3: Bronze ingestion — partially done (DuckDB path confirmed by CI; R2 conditional)
  { id: "P3-4", note: "DuckDB bronze layer loaded via ingestion/ with --reset flag" },
  { id: "P3-5", note: "Row count validation and ingestion run logging implemented" },

  // P4: dbt transformations — complete (212 tests, staging/int/gold all built)
  { id: "P4-1", note: "dbt project initialized with Snowflake and DuckDB targets" },
  { id: "P4-2", note: "Staging models (stg_*) built and tested" },
  { id: "P4-3", note: "Intermediate models (int_*) built and tested" },
  { id: "P4-4", note: "Gold marts (dim_* and fct_*) built and tested" },
  { id: "P4-5", note: "212 dbt assertions passing (built-ins + dbt-expectations)" },
  { id: "P4-6", note: "All models documented; dbt docs generated" },

  // P6: Containerization — partial (Docker present, CI smoke test passes)
  { id: "P6-1", note: "Python generation/ingestion service containerized in docker/" },
  { id: "P6-2", note: "Docker Compose stack defined" },
  { id: "P6-3", note: "pytest + dbt tests + smoke tests layered in CI" },
  { id: "P6-4", note: "CI runs in ubuntu-latest matching production environment" },

  // P7: CI/CD — mostly complete (ci.yml + scheduled.yml live)
  { id: "P7-1", note: "ci.yml defines lint, unit-test, smoke-test, docker-build stages" },
  { id: "P7-2", note: "Credentials stored as masked GitHub Actions secrets" },
  { id: "P7-3", note: "scheduled.yml runs full pipeline every Monday 02:00 UTC" },
  { id: "P7-4", note: "Docker build job gates merge — both test jobs must pass first" },
  { id: "P7-5", note: "Tracker integration wired via tracker-sync.yml and ci-tracker-steps.yml" },
];

const ONGOING_TASKS = [
  { id: "P3-1", note: "R2 bucket creation in progress — conditional upload step exists" },
  { id: "P3-2", note: "boto3 upload to R2 implemented; conditional on secrets" },
  { id: "P3-3", note: "Snowflake external stage — pending Snowflake provisioning" },
  { id: "P5-1", note: "Airflow Docker Compose defined in orchestration/" },
  { id: "P8-1", note: "Gold mart export to served/ implemented in scheduled pipeline" },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log(`\nMarking ${COMPLETED_TASKS.length} tasks as success...`);

  for (const t of COMPLETED_TASKS) {
    const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, t.id) });
    if (!task) {
      console.log(`  ⚠ ${t.id} not found — skipping`);
      continue;
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(schema.taskEvents)
        .values({
          id: `init-success-${t.id}`,
          taskId: t.id,
          status: "success",
          note: t.note,
          artifactLink: "https://github.com/swapniljoijode/Retail-Fashion-Intelligence",
        })
        .onConflictDoNothing();
      await tx
        .update(schema.tasks)
        .set({ currentStatus: "success", updatedAt: new Date() })
        .where(eq(schema.tasks.id, t.id));
    });
    console.log(`  ✓ ${t.id} → success`);
  }

  console.log(`\nMarking ${ONGOING_TASKS.length} tasks as ongoing...`);
  for (const t of ONGOING_TASKS) {
    const task = await db.query.tasks.findFirst({ where: eq(schema.tasks.id, t.id) });
    if (!task) {
      console.log(`  ⚠ ${t.id} not found — skipping`);
      continue;
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(schema.taskEvents)
        .values({
          id: `init-ongoing-${t.id}`,
          taskId: t.id,
          status: "ongoing",
          note: t.note,
          artifactLink: "https://github.com/swapniljoijode/Retail-Fashion-Intelligence",
        })
        .onConflictDoNothing();
      await tx
        .update(schema.tasks)
        .set({ currentStatus: "ongoing", updatedAt: new Date() })
        .where(eq(schema.tasks.id, t.id));
    });
    console.log(`  ● ${t.id} → ongoing`);
  }

  console.log("\n✓ Initial status migration complete.\n");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
