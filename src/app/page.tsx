export const dynamic = "force-dynamic";

import { db, projects, phases, tasks } from "@/db";
import { eq, sql } from "drizzle-orm";
import { PhaseProgressChart } from "@/components/PhaseProgressChart";
import { StatusDonut } from "@/components/StatusDonut";
import { ExportButtons } from "@/components/ExportButtons";
import { GitFork, Star, Users, BookOpen, ArrowUpRight, Activity } from "lucide-react";
import Link from "next/link";
import type { PhaseProgress } from "@/lib/types";

const GITHUB_USER = "swapniljoijode";

async function getAllTrackedProjects() {
  const allProjects = await db.query.projects.findMany();
  return Promise.all(
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
}

async function getGitHubProfile() {
  try {
    const headers: HeadersInit = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/users/${GITHUB_USER}`, {
      headers,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getRecentRepos() {
  try {
    const headers: HeadersInit = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=6&type=public`,
      { headers, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getProjectPhases(projectId: string) {
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return null;

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

  return { project, phases: rows as PhaseProgress[] };
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-zinc-400" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
          {label}
        </span>
      </div>
      <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

export default async function Home() {
  const [ghProfile, repos, trackedProjects] = await Promise.all([
    getGitHubProfile(),
    getRecentRepos(),
    getAllTrackedProjects(),
  ]);

  // Load phases for each tracked project
  const projectsWithPhases = await Promise.all(
    trackedProjects.map(async (p) => ({
      ...p,
      phaseData: await getProjectPhases(p.id),
    }))
  );

  // Aggregate totals across ALL tracked projects
  const grandTotals = trackedProjects.reduce(
    (acc, p) => ({
      total: acc.total + p.total,
      success: acc.success + p.success,
      ongoing: acc.ongoing + p.ongoing,
      failure: acc.failure + p.failure,
    }),
    { total: 0, success: 0, ongoing: 0, failure: 0 }
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* GitHub profile banner */}
      {ghProfile && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ghProfile.avatar_url}
              alt="GitHub avatar"
              className="w-14 h-14 rounded-full border-2 border-zinc-200 dark:border-zinc-700"
            />
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {ghProfile.name ?? ghProfile.login}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                @{ghProfile.login}
                {ghProfile.bio && ` · ${ghProfile.bio}`}
              </p>
            </div>
          </div>
          <a
            href={`https://github.com/${GITHUB_USER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
          >
            View on GitHub <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* GitHub + portfolio stats */}
      {ghProfile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Public Repos" value={ghProfile.public_repos} icon={BookOpen} />
          <StatCard label="Followers" value={ghProfile.followers} icon={Users} />
          <StatCard label="Projects Tracked" value={trackedProjects.length} icon={GitFork} />
          <StatCard
            label="Tasks Complete"
            value={`${grandTotals.success}/${grandTotals.total}`}
            icon={Activity}
            sub={`${grandTotals.ongoing} ongoing · ${grandTotals.failure} failed`}
          />
        </div>
      )}

      {/* Per-project progress sections */}
      {projectsWithPhases.map(
        ({ id, name, repository, pct, total, success, ongoing, failure, phaseData }) => (
          <div key={id} className="space-y-4">
            {/* Project header */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <Link
                    href={`/projects/${id}`}
                    className="text-base font-bold text-zinc-900 dark:text-white hover:text-black dark:hover:text-zinc-300 transition-colors"
                  >
                    {name}
                  </Link>
                  <a
                    href={repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-500 mt-0.5"
                  >
                    {repository.replace("https://github.com/", "")}{" "}
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                <Link
                  href={`/projects/${id}`}
                  className="text-xs font-bold text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 shrink-0"
                >
                  View all phases <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs text-zinc-500">
                <span className="font-mono font-bold">{pct}%</span>
                <span className="text-emerald-500 font-semibold">✓ {success} done</span>
                <span className="text-red-500 font-semibold">✗ {failure} failed</span>
                <span className="text-blue-500 font-semibold">● {ongoing} ongoing</span>
                <span className="ml-auto">{total} total</span>
              </div>
            </div>

            {/* Phase chart + donut */}
            {phaseData && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 mb-4">
                    {name} — completion by phase
                  </h3>
                  <PhaseProgressChart phases={phaseData.phases} />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 mb-4">
                    Status breakdown
                  </h3>
                  <StatusDonut ongoing={ongoing} success={success} failure={failure} />
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Recent GitHub repos */}
      {repos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
              Recent repositories
            </h3>
            <Link
              href="/projects"
              className="text-xs font-bold text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1"
            >
              All projects <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos
              .slice(0, 6)
              .map(
                (repo: {
                  id: number;
                  name: string;
                  full_name: string;
                  description: string;
                  html_url: string;
                  language: string;
                  stargazers_count: number;
                  forks_count: number;
                }) => (
                  <a
                    key={repo.id}
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white truncate">
                        {repo.name}
                      </p>
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-2" />
                    </div>
                    {repo.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      {repo.language && <span className="font-mono">{repo.language}</span>}
                      {repo.stargazers_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" /> {repo.stargazers_count}
                        </span>
                      )}
                      {repo.forks_count > 0 && (
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" /> {repo.forks_count}
                        </span>
                      )}
                    </div>
                  </a>
                )
              )}
          </div>
        </div>
      )}

      {/* Exports */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 mb-4">
          Export tracker data
        </h3>
        <ExportButtons />
      </div>
    </div>
  );
}
