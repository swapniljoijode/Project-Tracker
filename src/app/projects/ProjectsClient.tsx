"use client";

import { useState } from "react";
import { Star, GitFork, ArrowUpRight, CheckCircle2, Circle, Search } from "lucide-react";
import Link from "next/link";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  topics: string[];
}

interface TrackedProject {
  id: string;
  name: string;
  repository: string;
  templateVersion: number;
  total: number;
  success: number;
  failure: number;
  ongoing: number;
  phaseCount: number;
  pct: number;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-blue-400",
  SQL: "bg-orange-400",
  Shell: "bg-green-500",
  Dockerfile: "bg-cyan-500",
};

export default function ProjectsClient({
  repos,
  trackedProjects,
}: {
  repos: Repo[];
  trackedProjects: TrackedProject[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "tracked" | "untracked">("all");

  const trackedRepoNames = new Set(
    trackedProjects.map((p) => p.repository.split("/").pop()?.toLowerCase() ?? p.id)
  );

  const filtered = repos.filter((r) => {
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.language?.toLowerCase().includes(search.toLowerCase());

    const isTracked = trackedRepoNames.has(r.name.toLowerCase());
    const matchFilter = filter === "all" || (filter === "tracked" ? isTracked : !isTracked);

    return matchSearch && matchFilter;
  });

  const getTrackedData = (repoName: string) =>
    trackedProjects.find(
      (p) =>
        p.repository.split("/").pop()?.toLowerCase() === repoName.toLowerCase() ||
        p.id === repoName.toLowerCase().replace(/[^a-z0-9]/g, "-")
    );

  return (
    <div className="space-y-8">
      {/* Tracked projects summary */}
      {trackedProjects.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
            Tracked in Neon ({trackedProjects.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trackedProjects.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">{p.name}</p>
                    <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mt-0.5">
                      v{p.templateVersion} · {p.phaseCount} phases
                    </p>
                  </div>
                  <span className="text-lg font-extrabold text-emerald-500">{p.pct}%</span>
                </div>

                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex gap-3">
                    <span className="text-emerald-500 font-semibold">✓ {p.success}</span>
                    <span className="text-red-500 font-semibold">✗ {p.failure}</span>
                    <span className="text-blue-500 font-semibold">● {p.ongoing}</span>
                  </div>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-1 font-bold hover:text-black dark:hover:text-white transition-colors"
                  >
                    View <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GitHub repos */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
            GitHub Repositories ({filtered.length})
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repos..."
                className="pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
            {(["all", "tracked", "untracked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize ${
                  filter === f
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-black"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {repos.length === 0 && (
          <p className="text-sm text-zinc-500">
            Could not load GitHub repos. Add GITHUB_TOKEN to your environment for better rate
            limits.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((repo) => {
            const tracked = getTrackedData(repo.name);
            const dot = LANG_COLORS[repo.language ?? ""] ?? "bg-zinc-400";

            return (
              <div
                key={repo.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate pr-2">
                    {repo.name}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {tracked ? (
                      <span title="Tracked in Neon">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </span>
                    ) : (
                      <span title="Not tracked">
                        <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
                      </span>
                    )}
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-black dark:hover:text-white"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {repo.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                    {repo.description}
                  </p>
                )}

                {/* Tracker progress (if tracked) */}
                {tracked && (
                  <div className="mb-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-mono text-zinc-400">tracker progress</span>
                      <span className="font-bold text-emerald-500">{tracked.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${tracked.pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      {repo.language}
                    </span>
                  )}
                  {repo.stars > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" /> {repo.stars}
                    </span>
                  )}
                  {repo.forks > 0 && (
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3" /> {repo.forks}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] font-mono">
                    {new Date(repo.updatedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Topics */}
                {repo.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    {repo.topics.slice(0, 3).map((t: string) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-mono rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
