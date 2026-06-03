import { NextRequest, NextResponse } from "next/server";
import { db, projects, phases, tasks } from "@/db";
import { eq } from "drizzle-orm";
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
    phases: { created: 0, updated: 0, unchanged: 0 },
    tasks: { created: 0, updated: 0, unchanged: 0 },
  };

  // Upsert project
  await db
    .insert(projects)
    .values({
      id: template.project,
      name: template.project,
      repository: "",
      templateVersion: template.version,
    })
    .onConflictDoUpdate({
      target: projects.id,
      set: { templateVersion: template.version },
    });

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
          // Never overwrite currentStatus — status belongs to the runtime path
          set: { title: task.title, updatedAt: new Date() },
        });

      if (!existingTask) report.tasks.created++;
      else if (existingTask.title !== task.title) report.tasks.updated++;
      else report.tasks.unchanged++;
    }
  }

  return NextResponse.json(report, { status: 200 });
}
