import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const taskStatusEnum = pgEnum("task_status", ["ongoing", "success", "failure"]);
export const pipelineResultEnum = pgEnum("pipeline_result", ["success", "failure"]);

// ── project ───────────────────────────────────────────────────────────────────
// One row per tracked project. The tracker itself is one project; the retail
// platform will be seeded as a second project in Phase T9.

export const projects = pgTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  repository: text("repository").notNull(),
  templateVersion: integer("template_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── phase ─────────────────────────────────────────────────────────────────────
// One row per phase within a project. `order` drives display sequencing.

export const phases = pgTable("phase", {
  id: text("id").primaryKey(), // stable identifier e.g. "T0"
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── task ──────────────────────────────────────────────────────────────────────
// One row per task. `currentStatus` is a fast-read denormalisation of the
// latest task_event; the full audit trail lives in taskEvents.

export const tasks = pgTable("task", {
  id: text("id").primaryKey(), // stable identifier e.g. "T0-1"
  phaseId: text("phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  currentStatus: taskStatusEnum("current_status").notNull().default("ongoing"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── task_event ────────────────────────────────────────────────────────────────
// One row per status change. Never deleted. Every status transition — whether
// from the CLI, a pipeline, or the web UI — produces one row here.

export const taskEvents = pgTable("task_event", {
  id: text("id").primaryKey(), // caller-supplied idempotency key
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  status: taskStatusEnum("status").notNull(),
  note: text("note"),
  artifactLink: text("artifact_link"), // link to commit, log, or artifact
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── run ───────────────────────────────────────────────────────────────────────
// One row per pipeline run. Records which pipeline ran, what it produced, and
// when — so the tracker can surface CI history alongside task status.

export const runs = pgTable("run", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  pipeline: text("pipeline").notNull(), // e.g. "app-deploy" or "template-sync"
  result: pipelineResultEnum("result").notNull(),
  triggeredBy: text("triggered_by"), // branch, commit SHA, or user
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
