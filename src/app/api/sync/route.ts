import { NextRequest, NextResponse } from "next/server";
import { db, projects, phases, tasks } from "@/db";
import { eq, and, notInArray } from "drizzle-orm";
import { requireToken } from "@/lib/auth";
import { z } from "zod";

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
});

const PhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  tasks: z.array(TaskSchema),
});

const TemplateSchema = z.object({
  version: z.number(),
  project: z.string(),
  phases: z.array(PhaseSchema),
});

export async function POST(req: NextRequest) {
  const authError = requireToken(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const parsed = TemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid template", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const template = parsed.data;
  const report = {
    templateVersion: template.version,
    projectId: template.project,
    phases: { created: 0, updated: 0, unchanged: 0, deleted: 0 },
    tasks: { created: 0, updated: 0, unchanged: 0 },
  };

  // Upsert project — preserve name and repository if already set
  const existingProject = await db.query.projects.findFirst({
    where: eq(projects.id, template.project),
  });
  await db
    .insert(projects)
    .values({
      id: template.project,
      name: existingProject?.name ?? template.project,
      repository: existingProject?.repository ?? "",
      templateVersion: template.version,
    })
    .onConflictDoUpdate({
      target: projects.id,
      set: { templateVersion: template.version },
    });

  // Collect the canonical phase IDs from this template
  const canonicalPhaseIds = template.phases.map((p) => p.id);
  const canonicalTaskIds = template.phases.flatMap((p) => p.tasks.map((t) => t.id));

  // Delete stale phases for this project (phases not in the current template).
  // Tasks cascade via FK. This prevents duplicate lowercase/uppercase accumulation.
  const existingPhases = await db.query.phases.findMany({
    where: eq(phases.projectId, template.project),
  });
  const stalePhaseIds = existingPhases
    .map((p) => p.id)
    .filter((id) => !canonicalPhaseIds.includes(id));

  if (stalePhaseIds.length > 0) {
    await db
      .delete(phases)
      .where(and(eq(phases.projectId, template.project), notInArray(phases.id, canonicalPhaseIds)));
    report.phases.deleted = stalePhaseIds.length;
  }

  // Delete stale tasks whose IDs are not in the current template
  const existingTasks = await db.query.tasks.findMany();
  const projectTaskIds = existingTasks
    .filter((t) => canonicalPhaseIds.includes(t.phaseId))
    .map((t) => t.id);
  const staleTaskIds = projectTaskIds.filter((id) => !canonicalTaskIds.includes(id));
  if (staleTaskIds.length > 0) {
    await db.delete(tasks).where(notInArray(tasks.id, canonicalTaskIds));
  }

  // Upsert phases and tasks
  for (const [i, phase] of template.phases.entries()) {
    const existing = await db.query.phases.findFirst({ where: eq(phases.id, phase.id) });

    await db
      .insert(phases)
      .values({ id: phase.id, projectId: template.project, name: phase.name, order: i })
      .onConflictDoUpdate({ target: phases.id, set: { name: phase.name, order: i } });

    if (!existing) report.phases.created++;
    else if (existing.name !== phase.name || existing.order !== i) report.phases.updated++;
    else report.phases.unchanged++;

    for (const task of phase.tasks) {
      const existingTask = await db.query.tasks.findFirst({ where: eq(tasks.id, task.id) });

      await db
        .insert(tasks)
        .values({ id: task.id, phaseId: phase.id, title: task.title })
        .onConflictDoUpdate({
          target: tasks.id,
          // Never overwrite currentStatus — status is owned by the runtime path
          set: { title: task.title, updatedAt: new Date() },
        });

      if (!existingTask) report.tasks.created++;
      else if (existingTask.title !== task.title) report.tasks.updated++;
      else report.tasks.unchanged++;
    }
  }

  return NextResponse.json(report, { status: 200 });
}
