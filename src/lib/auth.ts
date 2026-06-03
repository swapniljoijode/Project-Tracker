import { NextRequest, NextResponse } from "next/server";

export function requireToken(req: NextRequest): NextResponse | null {
  const token = req.headers.get("x-tracker-token");
  if (!token || token !== process.env.TRACKER_API_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
