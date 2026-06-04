export const dynamic = "force-dynamic";

import { db, phases, tasks } from "@/db";
import { sql, eq } from "drizzle-orm";
import ProjectsClient from "./ProjectsClient";

const GITHUB_USER = "swapniljoijode";

async function getGitHubRepos() {
  try {
    const headers: HeadersInit = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=30&type=public`,
      { headers, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const repos = await res.json();
    return repos.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description ?? "",
      url: r.html_url,
      language: r.language ?? null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updatedAt: r.updated_at,
      topics: r.topics ?? [],
    }));
  } catch {
    return [];
  }
}

async function getTrackedProjects() {
  const allProjects = await db.query.projects.findMany();

  const progress = await Promise.all(
    allProjects.map(async (p) => {
      const rows = await db
        .select({
          total: sql<number>`count(${tasks.id})::int`,
          success: sql<number>`count(${tasks.id}) filter (where ${tasks.currentStatus} = 'success')::int`,
          failure: sql<number>`count(${tasks.id}) filter (where ${tasks.currentStatus} = 'failure')::int`,
          ongoing: sql<number>`count(${tasks.id}) filter (where ${tasks.currentStatus} = 'ongoing')::int`,
          phaseCount: sql<number>`count(distinct ${phases.id})::int`,
        })
        .from(phases)
        .leftJoin(tasks, eq(tasks.phaseId, phases.id))
        .where(eq(phases.projectId, p.id));

      const r = rows[0] ?? { total: 0, success: 0, failure: 0, ongoing: 0, phaseCount: 0 };
      return {
        ...p,
        ...r,
        pct: r.total > 0 ? Math.round((r.success / r.total) * 100) : 0,
      };
    })
  );

  return progress;
}

export default async function ProjectsPage() {
  const [repos, trackedProjects] = await Promise.all([getGitHubRepos(), getTrackedProjects()]);
  return <ProjectsClient repos={repos} trackedProjects={trackedProjects} />;
}
