import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runScrape } from "@/lib/run-scrape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const header = req.headers.get("authorization");
  const bearer = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? new URL(req.url).searchParams.get("token");
  return !!token && token === env.updateToken;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await runScrape();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.summary, durationMs: result.durationMs });
}

// Coolify scheduled task hits this with ?token=… (GET) or Bearer (POST).
export const GET = handle;
export const POST = handle;
