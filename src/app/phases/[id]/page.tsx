import { notFound } from "next/navigation";
import Link from "next/link";
import { db, phases, tasks, taskEvents } from "@/db";
import { eq, desc } from "drizzle-orm";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusControls } from "@/components/StatusControls";
import type { TaskStatus } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPhaseData(id: string) {
  const phase = await db.query.phases.findFirst({ where: eq(phases.id, id) });
  if (!phase) return null;

  const phaseTasks = await db.query.tasks.findMany({ where: eq(tasks.phaseId, id) });

  const taskIds = phaseTasks.map((t) => t.id);
  const allEvents = taskIds.length
    ? await db
        .select()
        .from(taskEvents)
        .where(eq(taskEvents.taskId, taskIds[0]))
        .orderBy(desc(taskEvents.createdAt))
        .then(async () => {
          // Fetch events for all tasks
          const eventsMap: Record<string, (typeof taskEvents.$inferSelect)[]> = {};
          for (const taskId of taskIds) {
            eventsMap[taskId] = await db
              .select()
              .from(taskEvents)
              .where(eq(taskEvents.taskId, taskId))
              .orderBy(desc(taskEvents.createdAt));
          }
          return eventsMap;
        })
    : {};

  return { phase, tasks: phaseTasks, eventsMap: allEvents };
}

function formatDate(iso: Date | string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  ongoing: "#3b82f6",
  success: "#22c55e",
  failure: "#ef4444",
};

export default async function PhasePage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPhaseData(id);
  if (!data) notFound();

  const { phase, tasks: phaseTasks, eventsMap } = data;
  const total = phaseTasks.length;
  const success = phaseTasks.filter((t) => t.currentStatus === "success").length;
  const pct = total > 0 ? Math.round((success / total) * 100) : 0;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Breadcrumb */}
      <Link href="/" style={{ fontSize: 13, color: "#666", textDecoration: "none" }}>
        ← Dashboard
      </Link>

      {/* Phase header */}
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{phase.name}</h1>
          <span style={{ color: "#555", fontSize: 14 }}>{phase.id}</span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 12,
            height: 5,
            background: "#222",
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{ height: "100%", width: `${pct}%`, background: "#22c55e", borderRadius: 99 }}
          />
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
          {success} / {total} tasks complete ({pct}%)
        </div>
      </div>

      {/* Task list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {phaseTasks.map((task) => {
          const events = eventsMap[task.id] ?? [];
          return (
            <div
              key={task.id}
              style={{
                background: "#111",
                border: `1px solid ${STATUS_COLOR[task.currentStatus as TaskStatus]}33`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* Task row */}
              <div
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 12, color: "#555", minWidth: 48 }}>{task.id}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{task.title}</span>
                <StatusBadge status={task.currentStatus as TaskStatus} />
                <StatusControls taskId={task.id} current={task.currentStatus as TaskStatus} />
              </div>

              {/* Event history */}
              {events.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid #1e1e1e",
                    padding: "10px 18px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 12 }}
                    >
                      <span
                        style={{
                          color: STATUS_COLOR[ev.status as TaskStatus],
                          minWidth: 56,
                          fontWeight: 600,
                        }}
                      >
                        {ev.status}
                      </span>
                      <span style={{ color: "#555" }}>{formatDate(ev.createdAt)}</span>
                      {ev.note && <span style={{ color: "#888" }}>{ev.note}</span>}
                      {ev.artifactLink && (
                        <a
                          href={ev.artifactLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#3b82f6", marginLeft: 4 }}
                        >
                          ↗ link
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
