import { NextResponse } from "next/server";

const GITHUB_USER = "swapniljoijode";

export async function GET() {
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com/users/${GITHUB_USER}`, {
    headers,
    next: { revalidate: 300 },
  });

  if (!res.ok) return NextResponse.json({ error: "GitHub API error" }, { status: res.status });
  return NextResponse.json(await res.json());
}
