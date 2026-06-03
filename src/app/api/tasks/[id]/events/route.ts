import { NextRequest, NextResponse } from "next/server";
import { db, tasks, taskEvents } from "@/db";
import { eq } from "drizzle-orm";
import { requireToken } from "@/lib/auth";
import { TaskEventPayload } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireToken(req);
  if (authError) return authError;

  const { id } = await params;

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body: TaskEventPayload = await req.json();
  if (!["ongoing", "success", "failure"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const eventId = body.idempotencyKey ?? randomUUID();

  await db.transaction(async (tx) => {
    await tx
      .insert(taskEvents)
      .values({
        id: eventId,
        taskId: id,
        status: body.status,
        note: body.note ?? null,
        artifactLink: body.artifactLink ?? null,
      })
      .onConflictDoNothing();

    await tx
      .update(tasks)
      .set({ currentStatus: body.status, updatedAt: new Date() })
      .where(eq(tasks.id, id));
  });

  return NextResponse.json({ eventId, taskId: id, status: body.status }, { status: 201 });
}
