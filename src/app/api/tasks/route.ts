import { NextRequest, NextResponse } from "next/server";
import { db, tasks, phases } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const phaseId = req.nextUrl.searchParams.get("phaseId");

  const rows = await db
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
    .where(phaseId ? eq(tasks.phaseId, phaseId) : undefined)
    .orderBy(phases.order, tasks.id);

  return NextResponse.json(rows);
}
