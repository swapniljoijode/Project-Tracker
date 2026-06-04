import { NextResponse } from "next/server";

const GITHUB_USER = "swapniljoijode";

export async function GET() {
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=30&type=public`,
    { headers, next: { revalidate: 300 } }
  );

  if (!res.ok) return NextResponse.json({ error: "GitHub API error" }, { status: res.status });

  const repos = await res.json();
  return NextResponse.json(
    repos.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updatedAt: r.updated_at,
      topics: r.topics,
      isPrivate: r.private,
    }))
  );
}
