import { NextRequest, NextResponse } from "next/server";
import { db, phases, tasks, projects } from "@/db";
import { eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? "project-tracker";

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

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
    .where(eq(phases.projectId, projectId))
    .groupBy(phases.id, phases.name, phases.order)
    .orderBy(phases.order);

  return NextResponse.json(rows);
}
