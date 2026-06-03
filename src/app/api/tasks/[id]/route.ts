import { NextRequest, NextResponse } from "next/server";
import { db, tasks, taskEvents, phases } from "@/db";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const task = await db
    .select({
      id: tasks.id,
      phaseId: tasks.phaseId,
      phaseName: phases.name,
      title: tasks.title,
      currentStatus: tasks.currentStatus,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(phases, eq(phases.id, tasks.phaseId))
    .where(eq(tasks.id, id))
    .limit(1);

  if (!task.length) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const events = await db
    .select()
    .from(taskEvents)
    .where(eq(taskEvents.taskId, id))
    .orderBy(desc(taskEvents.createdAt));

  return NextResponse.json({ ...task[0], events });
}
