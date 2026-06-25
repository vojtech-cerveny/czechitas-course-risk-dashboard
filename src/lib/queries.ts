import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses, snapshots, type Course, type Snapshot } from "@/lib/db/schema";
import { ensureMigrated } from "@/lib/db/migrate";
import { getThresholds } from "@/lib/settings";
import { computeRisk, type RiskResult } from "@/lib/risk";

export interface CourseWithRisk {
  course: Course;
  latest: Snapshot | null;
  history: { capturedAt: number; phase3Pct: number | null }[];
  risk: RiskResult;
  snapshotCount: number;
}

const riskRank: Record<string, number> = { red: 0, yellow: 1, none: 2, pending: 3 };

export function getCoursesWithRisk(): CourseWithRisk[] {
  ensureMigrated();
  const t = getThresholds();
  const allCourses = db.select().from(courses).all();
  const allSnaps = db.select().from(snapshots).orderBy(asc(snapshots.capturedAt)).all();

  const byCourse = new Map<number, Snapshot[]>();
  for (const s of allSnaps) {
    const arr = byCourse.get(s.courseId) ?? [];
    arr.push(s);
    byCourse.set(s.courseId, arr);
  }

  const result: CourseWithRisk[] = allCourses.map((course) => {
    const snaps = byCourse.get(course.id) ?? [];
    const history = snaps.map((s) => ({
      capturedAt: s.capturedAt.getTime(),
      phase3Pct: s.phase3Pct,
    }));
    const latest = snaps.length ? snaps[snaps.length - 1] : null;
    const risk = computeRisk(
      {
        state: course.state,
        startAt: course.startAt,
        registrationDeadline: course.registrationDeadline,
        fillHistory: history,
      },
      t,
    );
    return { course, latest, history, risk, snapshotCount: snaps.length };
  });

  result.sort((a, b) => {
    const r = riskRank[a.risk.level] - riskRank[b.risk.level];
    if (r !== 0) return r;
    const da = a.risk.daysToDeadline ?? Infinity;
    const dbb = b.risk.daysToDeadline ?? Infinity;
    if (da !== dbb) return da - dbb;
    return (a.risk.fill ?? 999) - (b.risk.fill ?? 999);
  });

  return result;
}

export interface CourseDetail {
  course: Course;
  snapshots: Snapshot[];
  risk: RiskResult;
}

export function getCourseDetail(id: number): CourseDetail | null {
  ensureMigrated();
  const course = db.select().from(courses).where(eq(courses.id, id)).get();
  if (!course) return null;
  const snaps = db
    .select()
    .from(snapshots)
    .where(eq(snapshots.courseId, id))
    .orderBy(asc(snapshots.capturedAt))
    .all();
  const risk = computeRisk(
    {
      state: course.state,
      startAt: course.startAt,
      registrationDeadline: course.registrationDeadline,
      fillHistory: snaps.map((s) => ({
        capturedAt: s.capturedAt.getTime(),
        phase3Pct: s.phase3Pct,
      })),
    },
    getThresholds(),
  );
  return { course, snapshots: snaps, risk };
}

export interface OverviewStats {
  total: number;
  byLevel: Record<string, number>;
  lastCapturedAt: string | null;
  riskOverTime: { date: string; red: number; yellow: number }[];
  fillByTheme: { theme: string; avgFill: number; count: number }[];
}

export function getOverviewStats(): OverviewStats {
  const rows = getCoursesWithRisk();
  const byLevel: Record<string, number> = { red: 0, yellow: 0, none: 0, pending: 0 };
  for (const r of rows) byLevel[r.risk.level] = (byLevel[r.risk.level] ?? 0) + 1;

  // Risk-over-time: for each capture day, count red/yellow among registration-open courses.
  const t = getThresholds();
  const dayMap = new Map<string, { red: number; yellow: number }>();
  const allSnaps = db.select().from(snapshots).orderBy(asc(snapshots.capturedAt)).all();
  const courseMap = new Map(getCourseList().map((c) => [c.id, c]));
  // Build per-course running history to evaluate risk at each capture point.
  const histByCourse = new Map<number, { capturedAt: number; phase3Pct: number | null }[]>();
  for (const s of allSnaps) {
    const hist = histByCourse.get(s.courseId) ?? [];
    hist.push({ capturedAt: s.capturedAt.getTime(), phase3Pct: s.phase3Pct });
    histByCourse.set(s.courseId, hist);
    const c = courseMap.get(s.courseId);
    if (!c) continue;
    const day = s.capturedAt.toISOString().slice(0, 10);
    const bucket = dayMap.get(day) ?? { red: 0, yellow: 0 };
    const risk = computeRisk(
      {
        state: s.state,
        startAt: c.startAt,
        registrationDeadline: c.registrationDeadline,
        fillHistory: [...hist],
      },
      t,
      Date.parse(day + "T12:00:00Z"),
    );
    if (risk.level === "red") bucket.red++;
    else if (risk.level === "yellow") bucket.yellow++;
    dayMap.set(day, bucket);
  }
  const riskOverTime = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Average fill by theme among open courses.
  const themeAgg = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    if (r.course.state !== "realization_registration_open" || r.risk.fill == null) continue;
    const theme = r.course.theme ?? "—";
    const agg = themeAgg.get(theme) ?? { sum: 0, count: 0 };
    agg.sum += r.risk.fill;
    agg.count++;
    themeAgg.set(theme, agg);
  }
  const fillByTheme = [...themeAgg.entries()]
    .map(([theme, a]) => ({ theme, avgFill: Math.round(a.sum / a.count), count: a.count }))
    .sort((a, b) => a.avgFill - b.avgFill);

  const lastCapturedAt = allSnaps.length
    ? allSnaps[allSnaps.length - 1].capturedAt.toISOString()
    : null;

  return {
    total: rows.length,
    byLevel,
    lastCapturedAt,
    riskOverTime,
    fillByTheme,
  };
}

function getCourseList(): Course[] {
  return db.select().from(courses).all();
}
