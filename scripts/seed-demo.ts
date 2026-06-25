// tsx --env-file=.env.local scripts/seed-demo.ts
// Dev-only: inserts demo courses with backdated declining history so the UI shows
// red/yellow risk and a real trend line. Demo ids are >= 900000 so they never collide
// with real IS events. Safe to delete: DELETE FROM courses WHERE id >= 900000.
import { db } from "@/lib/db";
import { courses, snapshots } from "@/lib/db/schema";
import { ensureMigrated } from "@/lib/db/migrate";

ensureMigrated();

const DAY = 86_400_000;
const now = Date.now();
const isoDay = (offset: number) =>
  new Date(now + offset * DAY).toISOString().slice(0, 10);

interface Demo {
  id: number;
  title: string;
  startInDays: number;
  fills: number[]; // oldest -> newest phase3 %, one per day back
}

const demos: Demo[] = [
  { id: 900001, title: "[DEMO] Úvod do Pythonu — kritický", startInDays: 4, fills: [55, 50, 44, 40, 35, 30, 28, 25] },
  { id: 900002, title: "[DEMO] Datová analýza — sledovat", startInDays: 12, fills: [40, 42, 41, 43, 44, 45, 45, 46] },
  { id: 900003, title: "[DEMO] UX workshop — v pohodě", startInDays: 9, fills: [60, 70, 80, 88, 92, 95, 98, 101] },
];

for (const d of demos) {
  db.insert(courses)
    .values({
      id: d.id,
      title: d.title,
      theme: "Práce s daty",
      format: "Kurz",
      length: "Vícedenní",
      participantGroup: "ženy (19+)",
      place: "Online",
      month: "červenec",
      year: 2026,
      startAt: isoDay(d.startInDays),
      endAt: isoDay(d.startInDays + 3),
      state: "realization_registration_open",
      stateLabel: "registrace spuštěna",
      capacity: 30,
      maxCapacity: 30,
      registrationDeadline: null,
      deadlineSource: "start_date",
      firstSeenAt: new Date(now - (d.fills.length - 1) * DAY),
      lastSeenAt: new Date(now),
    })
    .onConflictDoUpdate({
      target: courses.id,
      set: { startAt: isoDay(d.startInDays), lastSeenAt: new Date(now) },
    })
    .run();

  // wipe prior demo snapshots, then backfill
  db.delete(snapshots).where(eqCourse(d.id)).run();
  d.fills.forEach((fill, i) => {
    const captured = new Date(now - (d.fills.length - 1 - i) * DAY);
    db.insert(snapshots)
      .values({
        courseId: d.id,
        capturedAt: captured,
        phase2Pct: 100,
        phase3Pct: fill,
        phase4Pct: Math.round(fill * 0.6),
        phase3Severity: fill < 70 ? "warning" : "success",
        registeredCount: Math.round((fill / 100) * 30),
        capacity: 30,
        state: "realization_registration_open",
      })
      .run();
  });
  console.log(`seeded ${d.title} with ${d.fills.length} snapshots`);
}

import { eq } from "drizzle-orm";
function eqCourse(id: number) {
  return eq(snapshots.courseId, id);
}
