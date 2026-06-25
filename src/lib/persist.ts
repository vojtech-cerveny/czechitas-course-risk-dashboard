import { db } from "@/lib/db";
import { courses, snapshots } from "@/lib/db/schema";
import { ensureMigrated } from "@/lib/db/migrate";
import type { ScrapeResult } from "@/lib/scraper";

export interface PersistSummary {
  coursesSeen: number;
  snapshotsWritten: number;
  capturedAt: string;
}

/** Upsert courses and append one snapshot row per course for this run. */
export function persistScrape(result: ScrapeResult): PersistSummary {
  ensureMigrated();
  const capturedAt = result.capturedAt;
  let snapshotsWritten = 0;

  db.transaction((tx) => {
    for (const { row, detail } of result.courses) {
      const hasExplicitDeadline = detail.registrationDeadline != null;
      tx.insert(courses)
        .values({
          id: row.id,
          title: row.title,
          theme: row.theme,
          format: row.format,
          length: row.length,
          participantGroup: row.participantGroup,
          place: row.place,
          month: row.month,
          year: row.year,
          startAt: row.startAt,
          endAt: row.endAt,
          state: row.state,
          stateLabel: row.stateLabel,
          capacity: detail.capacity ?? detail.maxCapacity ?? null,
          maxCapacity: detail.maxCapacity ?? null,
          registrationDeadline: detail.registrationDeadline,
          deadlineSource: hasExplicitDeadline ? "deadline" : "start_date",
          firstSeenAt: capturedAt,
          lastSeenAt: capturedAt,
        })
        .onConflictDoUpdate({
          target: courses.id,
          set: {
            title: row.title,
            theme: row.theme,
            format: row.format,
            length: row.length,
            participantGroup: row.participantGroup,
            place: row.place,
            month: row.month,
            year: row.year,
            startAt: row.startAt,
            endAt: row.endAt,
            state: row.state,
            stateLabel: row.stateLabel,
            capacity: detail.capacity ?? detail.maxCapacity ?? null,
            maxCapacity: detail.maxCapacity ?? null,
            registrationDeadline: detail.registrationDeadline,
            deadlineSource: hasExplicitDeadline ? "deadline" : "start_date",
            lastSeenAt: capturedAt,
          },
        })
        .run();

      tx.insert(snapshots)
        .values({
          courseId: row.id,
          capturedAt,
          phase2Pct: row.phase2.percent,
          phase3Pct: row.phase3.percent,
          phase4Pct: row.phase4.percent,
          phase3Severity: row.phase3.severity,
          registeredCount: detail.registeredCount,
          capacity: detail.capacity ?? detail.maxCapacity ?? null,
          state: row.state,
        })
        .run();
      snapshotsWritten++;
    }
  });

  return {
    coursesSeen: result.courses.length,
    snapshotsWritten,
    capturedAt: capturedAt.toISOString(),
  };
}
