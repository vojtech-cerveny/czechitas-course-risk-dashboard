import { NextResponse } from "next/server";
import { runScrape } from "@/lib/run-scrape";

// Session-protected (gated by middleware): lets a logged-in user trigger a scrape
// from the UI without needing the cron token.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const result = await runScrape();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.summary, durationMs: result.durationMs });
}
