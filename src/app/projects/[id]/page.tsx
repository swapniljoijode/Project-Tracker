export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { db, projects, phases, tasks, taskEvents } from "@/db";
import { eq, sql, desc } from "drizzle-orm";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusControls } from "@/components/StatusControls";
import { ArrowUpRight } from "lucide-react";
import type { TaskStatus } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

async function getProjectData(projectId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return null;

  const phaseRows = await db
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
    .where(eq(phases.projectId, projectId))
    .groupBy(phases.id, phases.name, phases.order)
    .orderBy(phases.order);

  return { project, phases: phaseRows };
}

async function getPhaseTasksWithEvents(phaseId: string) {
  const phaseTasks = await db.query.tasks.findMany({
    where: eq(tasks.phaseId, phaseId),
    orderBy: tasks.id,
  });

  const eventsMap: Record<string, (typeof taskEvents.$inferSelect)[]> = {};
  for (const task of phaseTasks) {
    eventsMap[task.id] = await db
      .select()
      .from(taskEvents)
      .where(eq(taskEvents.taskId, task.id))
      .orderBy(desc(taskEvents.createdAt));
  }

  return { tasks: phaseTasks, eventsMap };
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  ongoing: "#3b82f6",
  success: "#22c55e",
  failure: "#ef4444",
};

function formatDate(iso: Date | string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getProjectData(id);
  if (!data) notFound();

  const { project, phases: phaseRows } = data;
  const totals = phaseRows.reduce(
    (acc, p) => ({
      total: acc.total + p.total,
      success: acc.success + p.success,
      ongoing: acc.ongoing + p.ongoing,
      failure: acc.failure + p.failure,
    }),
    { total: 0, success: 0, ongoing: 0, failure: 0 }
  );
  const overallPct = totals.total > 0 ? Math.round((totals.success / totals.total) * 100) : 0;

  // Load tasks for all phases
  const phaseData = await Promise.all(
    phaseRows.map(async (phase) => ({
      phase,
      ...(await getPhaseTasksWithEvents(phase.id)),
    }))
  );

  return (
    <div className="space-y-8">
      {/* Project header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <Link
              href="/projects"
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              ← Projects
            </Link>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mt-2">{project.name}</h1>
            <a
              href={project.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-blue-500 flex items-center gap-1 mt-1"
            >
              {project.repository} <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <span className="text-2xl font-extrabold text-emerald-500 shrink-0">{overallPct}%</span>
        </div>

        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="flex gap-5 text-xs text-zinc-500">
          <span className="text-emerald-500 font-semibold">✓ {totals.success} done</span>
          <span className="text-red-500 font-semibold">✗ {totals.failure} failed</span>
          <span className="text-blue-500 font-semibold">● {totals.ongoing} ongoing</span>
          <span className="ml-auto">{totals.total} total tasks</span>
        </div>
      </div>

      {/* Phase summary grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {phaseRows.map((phase) => {
          const pct = phase.total > 0 ? Math.round((phase.success / phase.total) * 100) : 0;
          return (
            <a
              key={phase.id}
              href={`#phase-${phase.id}`}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
            >
              <div className="flex justify-between items-baseline mb-2">
                <span className="font-mono text-xs font-bold text-zinc-400">{phase.id}</span>
                <span className="text-xs font-bold text-emerald-500">{pct}%</span>
              </div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate mb-2">
                {phase.name}
              </p>
              <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </a>
          );
        })}
      </div>

      {/* Full phase + task list */}
      <div className="space-y-6">
        {phaseData.map(({ phase, tasks: phaseTasks, eventsMap }) => {
          const pct = phase.total > 0 ? Math.round((phase.success / phase.total) * 100) : 0;
          return (
            <div
              key={phase.id}
              id={`phase-${phase.id}`}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
            >
              {/* Phase header */}
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-400">{phase.id}</span>
                    <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {phase.name}
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {phase.success}/{phase.total} tasks · {pct}%
                  </p>
                </div>
                <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Tasks */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {phaseTasks.map((task) => {
                  const events = eventsMap[task.id] ?? [];
                  const status = task.currentStatus as TaskStatus;
                  return (
                    <div key={task.id}>
                      <div
                        className="px-5 py-3 flex items-center gap-3 flex-wrap"
                        style={{ borderLeft: `3px solid ${STATUS_COLOR[status]}33` }}
                      >
                        <span className="font-mono text-xs text-zinc-400 w-12 shrink-0">
                          {task.id}
                        </span>
                        <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 min-w-0">
                          {task.title}
                        </span>
                        <StatusBadge status={status} />
                        <StatusControls taskId={task.id} current={status} />
                      </div>
                      {events.length > 0 && (
                        <div className="px-5 pb-3 space-y-1 bg-zinc-50/50 dark:bg-zinc-800/20">
                          {events.map((ev) => (
                            <div key={ev.id} className="flex gap-3 text-xs items-baseline">
                              <span
                                className="font-semibold w-14 shrink-0"
                                style={{ color: STATUS_COLOR[ev.status as TaskStatus] }}
                              >
                                {ev.status}
                              </span>
                              <span className="text-zinc-400">{formatDate(ev.createdAt)}</span>
                              {ev.note && <span className="text-zinc-500">{ev.note}</span>}
                              {ev.artifactLink && (
                                <a
                                  href={ev.artifactLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
