import "server-only";
import { scrapeAll } from "@/lib/scraper";
import { persistScrape, type PersistSummary } from "@/lib/persist";

// Module-level lock. One container, so this is enough to prevent overlapping runs.
let running = false;

export type RunResult =
  | { ok: true; summary: PersistSummary; durationMs: number }
  | { ok: false; status: number; error: string };

export async function runScrape(): Promise<RunResult> {
  if (running) {
    return { ok: false, status: 409, error: "A scrape is already in progress" };
  }
  running = true;
  const started = Date.now();
  try {
    const result = await scrapeAll();
    const summary = persistScrape(result);
    return { ok: true, summary, durationMs: Date.now() - started };
  } catch (err) {
    console.error("[runScrape] failed:", err);
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    running = false;
  }
}
