// tsx --env-file=.env.local scripts/run-scrape.ts
import { scrapeAll } from "@/lib/scraper";
import { persistScrape } from "@/lib/persist";
import { getKnownCourseIds } from "@/lib/db/known-ids";
import { db } from "@/lib/db";
import { courses, snapshots } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.time("scrape");
  const result = await scrapeAll({ knownIds: getKnownCourseIds() });
  console.timeEnd("scrape");
  const summary = persistScrape(result);
  console.log("summary:", summary);

  const cCount = db.select({ n: sql<number>`count(*)` }).from(courses).get();
  const sCount = db.select({ n: sql<number>`count(*)` }).from(snapshots).get();
  console.log("DB courses:", cCount?.n, "snapshots:", sCount?.n);

  const sample = db.select().from(courses).limit(3).all();
  for (const c of sample) {
    console.log(`  #${c.id} "${c.title}" state=${c.state} start=${c.startAt} deadlineSrc=${c.deadlineSource}`);
  }
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
