export const dynamic = "force-dynamic";

import { db, taskEvents, tasks, phases } from "@/db";
import { desc, eq } from "drizzle-orm";
import { CheckCircle2, XCircle, Circle, Clock } from "lucide-react";
import type { TaskStatus } from "@/lib/types";

async function getRecentEvents() {
  return db
    .select({
      id: taskEvents.id,
      status: taskEvents.status,
      note: taskEvents.note,
      artifactLink: taskEvents.artifactLink,
      createdAt: taskEvents.createdAt,
      taskId: tasks.id,
      taskTitle: tasks.title,
      phaseId: phases.id,
      phaseName: phases.name,
    })
    .from(taskEvents)
    .innerJoin(tasks, eq(tasks.id, taskEvents.taskId))
    .innerJoin(phases, eq(phases.id, tasks.phaseId))
    .orderBy(desc(taskEvents.createdAt))
    .limit(100);
}

async function getEventStats() {
  const all = await db.select().from(taskEvents);
  const success = all.filter((e) => e.status === "success").length;
  const failure = all.filter((e) => e.status === "failure").length;
  const ongoing = all.filter((e) => e.status === "ongoing").length;
  return { total: all.length, success, failure, ongoing };
}

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
  failure: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  ongoing: <Circle className="w-4 h-4 text-blue-500 shrink-0" />,
};

const STATUS_BG: Record<TaskStatus, string> = {
  success: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40",
  failure: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40",
  ongoing: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40",
};

export default async function ReportingPage() {
  const [events, stats] = await Promise.all([getRecentEvents(), getEventStats()]);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total events", value: stats.total, color: "text-zinc-900 dark:text-white" },
          { label: "Success", value: stats.success, color: "text-emerald-500" },
          { label: "Failure", value: stats.failure, color: "text-red-500" },
          { label: "Ongoing", value: stats.ongoing, color: "text-blue-500" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl"
          >
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold mb-2">
              {s.label}
            </p>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Event log */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
            Event history ({events.length})
          </h3>
        </div>

        {events.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No events recorded yet.</p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
            {events.map((ev) => (
              <div
                key={ev.id}
                className={`px-6 py-4 flex items-start gap-4 border-l-2 ${STATUS_BG[ev.status as TaskStatus]}`}
              >
                {STATUS_ICON[ev.status as TaskStatus]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div>
                      <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        {ev.phaseId} ·{" "}
                      </span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {ev.taskTitle}
                      </span>
                      <span className="ml-2 text-xs font-mono text-zinc-400">({ev.taskId})</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      {new Date(ev.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {ev.note && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{ev.note}</p>
                  )}
                  {ev.artifactLink && (
                    <a
                      href={ev.artifactLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                    >
                      {ev.artifactLink}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
