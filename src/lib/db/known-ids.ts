import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { ensureMigrated } from "@/lib/db/migrate";

/** Ids of all courses we have ever seen — input for the scraper's follow-up sweep. */
export function getKnownCourseIds(): number[] {
  ensureMigrated();
  return db
    .select({ id: courses.id })
    .from(courses)
    .all()
    .map((r) => r.id);
}
