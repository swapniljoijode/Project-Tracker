export const dynamic = "force-dynamic";

import { db, projects, phases, tasks } from "@/db";
import { eq, sql } from "drizzle-orm";
import { PhaseCard } from "@/components/PhaseCard";
import { PhaseProgressChart } from "@/components/PhaseProgressChart";
import { StatusDonut } from "@/components/StatusDonut";
import { ExportButtons } from "@/components/ExportButtons";
import type { PhaseProgress } from "@/lib/types";

const PROJECT_ID = "project-tracker";

async function getProgress() {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, PROJECT_ID),
  });

  if (!project) return null;

  const rows = await db
    .select({
      id: phases.id,
      name: phases.name,
      order: phases.order,
      total: sql<number>`count(${tasks.id})::int`,
      ongoing: sql<number>`count(${tasks.id}) filter (where ${tasks.currentStatus} = 'ongoing')::int`,
      success: sql<number>`count(${tasks.id}) filter (where ${tasks.currentStatus} = 'success')::int`,
      failure: sql<number>`count(${tasks.id}) filter (where ${tasks.currentStatus} = 'failure')::int`,
    })
    .from(phases)
    .leftJoin(tasks, eq(tasks.phaseId, phases.id))
    .where(eq(phases.projectId, PROJECT_ID))
    .groupBy(phases.id, phases.name, phases.order)
    .orderBy(phases.order);

  return { project, phases: rows as PhaseProgress[] };
}

export default async function Home() {
  const data = await getProgress();

  if (!data) {
    return (
      <main style={{ padding: "2rem" }}>
        <p style={{ color: "#666" }}>
          No project data yet. Run <code>npm run seed</code> to populate.
        </p>
      </main>
    );
  }

  const totals = data.phases.reduce(
    (acc, p) => ({
      total: acc.total + p.total,
      ongoing: acc.ongoing + p.ongoing,
      success: acc.success + p.success,
      failure: acc.failure + p.failure,
    }),
    { total: 0, ongoing: 0, success: 0, failure: 0 }
  );

  const overallPct = totals.total > 0 ? Math.round((totals.success / totals.total) * 100) : 0;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Project Tracker</h1>
        <p style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
          Fashion Retail Intelligence Platform — build progress
        </p>
      </div>

      {/* Overall progress bar */}
      <div
        style={{
          marginBottom: 32,
          background: "#111",
          border: "1px solid #222",
          borderRadius: 10,
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          <span style={{ color: "#aaa" }}>Overall completion</span>
          <span style={{ fontWeight: 700 }}>{overallPct}%</span>
        </div>
        <div style={{ height: 6, background: "#222", borderRadius: 99, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${overallPct}%`,
              background: "#22c55e",
              borderRadius: 99,
              transition: "width 0.4s",
            }}
          />
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 20, fontSize: 12, color: "#666" }}>
          <span style={{ color: "#22c55e" }}>✓ {totals.success} done</span>
          <span style={{ color: "#ef4444" }}>✗ {totals.failure} failed</span>
          <span style={{ color: "#3b82f6" }}>● {totals.ongoing} in progress</span>
          <span style={{ marginLeft: "auto" }}>{totals.total} total tasks</span>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, marginBottom: 32 }}>
        <div
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 10,
            padding: "16px 20px",
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#888", margin: "0 0 12px" }}>
            COMPLETION BY PHASE
          </h2>
          <PhaseProgressChart phases={data.phases} />
        </div>
        <div
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 10,
            padding: "16px 20px",
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#888", margin: "0 0 12px" }}>
            STATUS BREAKDOWN
          </h2>
          <StatusDonut ongoing={totals.ongoing} success={totals.success} failure={totals.failure} />
        </div>
      </div>

      {/* Exports */}
      <div
        style={{
          marginBottom: 32,
          background: "#111",
          border: "1px solid #222",
          borderRadius: 10,
          padding: "16px 20px",
        }}
      >
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "#888", margin: "0 0 12px" }}>EXPORT</h2>
        <ExportButtons />
      </div>

      {/* Phase grid */}
      <h2 style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 12 }}>PHASES</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {data.phases.map((phase) => (
          <PhaseCard key={phase.id} phase={phase} />
        ))}
      </div>
    </main>
  );
}
