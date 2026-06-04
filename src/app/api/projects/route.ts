import { NextRequest, NextResponse } from "next/server";
import { db, projects } from "@/db";
import { requireToken } from "@/lib/auth";
import { z } from "zod";

const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  repository: z.string().url(),
  templateVersion: z.number().int().min(0).optional().default(0),
});

export async function GET() {
  const all = await db.query.projects.findMany({ orderBy: (p, { asc }) => [asc(p.id)] });
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const authError = requireToken(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const parsed = ProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, name, repository, templateVersion } = parsed.data;

  await db.insert(projects).values({ id, name, repository, templateVersion }).onConflictDoUpdate({
    target: projects.id,
    set: { name, repository, templateVersion },
  });

  return NextResponse.json({ id, name, repository, templateVersion }, { status: 201 });
}
