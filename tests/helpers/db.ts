import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../src/db/schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export function createTestDb(): { pool: Pool; db: TestDb } {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  return { pool, db };
}

/** Truncate all tables in dependency order (events → tasks → phases → projects). */
export async function resetDb(db: TestDb): Promise<void> {
  await db.delete(schema.taskEvents);
  await db.delete(schema.runs);
  await db.delete(schema.tasks);
  await db.delete(schema.phases);
  await db.delete(schema.projects);
}

/** Seed project/phases/tasks from tracker_tasks.yaml — mirrors scripts/sync.ts. */
export async function seedFromTemplate(db: TestDb): Promise<void> {
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

  const raw = readFileSync(join(process.cwd(), "tracker_tasks.yaml"), "utf8");
  const template = parse(raw) as Template;

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

  for (const [i, phase] of template.phases.entries()) {
    await db
      .insert(schema.phases)
      .values({ id: phase.id, projectId: template.project, name: phase.name, order: i })
      .onConflictDoUpdate({
        target: schema.phases.id,
        set: { name: phase.name, order: i },
      });

    for (const task of phase.tasks) {
      await db
        .insert(schema.tasks)
        .values({ id: task.id, phaseId: phase.id, title: task.title })
        .onConflictDoUpdate({
          target: schema.tasks.id,
          set: { title: task.title, updatedAt: new Date("2024-01-01T00:00:00Z") },
        });
    }
  }
}

/** Apply a fixed, deterministic sequence of status transitions. */
export const FIXED_STATUS_SEQUENCE = [
  { taskId: "T0-1", status: "ongoing" as const, note: "started" },
  { taskId: "T0-1", status: "success" as const, note: "repo initialized" },
  { taskId: "T0-2", status: "ongoing" as const, note: "in progress" },
  { taskId: "T0-3", status: "ongoing" as const },
  { taskId: "T0-3", status: "failure" as const, note: "blocked by missing dep" },
  { taskId: "T1-1", status: "ongoing" as const },
  { taskId: "T1-1", status: "success" as const, note: "model finalized" },
  { taskId: "T2-1", status: "ongoing" as const },
] as const;

export async function applyFixedSequence(db: TestDb): Promise<void> {
  const FIXED_TS = new Date("2024-06-01T12:00:00Z");

  for (const [i, step] of FIXED_STATUS_SEQUENCE.entries()) {
    const eventId = `test-evt-${String(i).padStart(3, "0")}`;
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.taskEvents)
        .values({
          id: eventId,
          taskId: step.taskId,
          status: step.status,
          note: "note" in step ? (step.note ?? null) : null,
          artifactLink: null,
          createdAt: FIXED_TS,
        })
        .onConflictDoNothing();

      await tx
        .update(schema.tasks)
        .set({ currentStatus: step.status, updatedAt: FIXED_TS })
        .where(eq(schema.tasks.id, step.taskId));
    });
  }
}

export interface TaskSnapshot {
  id: string;
  phaseId: string;
  title: string;
  currentStatus: string;
  eventCount: number;
  lastEventStatus: string | null;
}

/** Capture a deterministic snapshot of all tasks and their event counts. */
export async function captureSnapshot(db: TestDb): Promise<TaskSnapshot[]> {
  const allTasks = await db.select().from(schema.tasks).orderBy(schema.tasks.id);

  const allEvents = await db
    .select()
    .from(schema.taskEvents)
    .orderBy(schema.taskEvents.taskId, schema.taskEvents.createdAt);

  const eventsByTask: Record<string, typeof allEvents> = {};
  for (const ev of allEvents) {
    if (!eventsByTask[ev.taskId]) eventsByTask[ev.taskId] = [];
    eventsByTask[ev.taskId].push(ev);
  }

  return allTasks.map((t) => {
    const events = eventsByTask[t.id] ?? [];
    return {
      id: t.id,
      phaseId: t.phaseId,
      title: t.title,
      currentStatus: t.currentStatus,
      eventCount: events.length,
      lastEventStatus: events.at(-1)?.status ?? null,
    };
  });
}
