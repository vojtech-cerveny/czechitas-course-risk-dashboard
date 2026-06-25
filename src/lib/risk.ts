import type { Thresholds } from "@/lib/settings";
import { days } from "@/lib/utils";

export type RiskLevel = "red" | "yellow" | "none" | "pending";

export interface RiskInput {
  state: string;
  startAt: string | null; // ISO yyyy-mm-dd
  registrationDeadline: string | null; // ISO yyyy-mm-dd (proxy = startAt)
  // phase3 (registration fill) history, oldest -> newest
  fillHistory: { capturedAt: number; phase3Pct: number | null }[];
}

export interface RiskResult {
  level: RiskLevel;
  fill: number | null; // latest phase3 fill %
  daysToDeadline: number | null;
  deadline: string | null;
  deadlineSource: "deadline" | "start_date" | null;
  trendSlope: number | null; // % per day; <0 means declining
  reasons: string[];
}

function daysBetween(fromIso: string, toMs: number): number {
  const from = Date.parse(fromIso + "T00:00:00Z");
  return Math.round((from - toMs) / 86_400_000);
}

// Minimum history before we trust a trend: at least 3 points spanning ~half a day,
// so intra-run noise (two captures minutes apart) never reads as a real decline.
const MIN_TREND_POINTS = 3;
const MIN_TREND_SPAN_DAYS = 0.5;
// A decline must be clearly downward, not flat, to count.
const DECLINE_SLOPE = -0.2; // % per day

// Least-squares slope of phase3 fill over time (% per day). Null if history is too thin.
function trendSlope(history: RiskInput["fillHistory"], window: number): number | null {
  const pts = history
    .filter((h) => h.phase3Pct != null)
    .slice(-window)
    .map((h) => ({ x: h.capturedAt / 86_400_000, y: h.phase3Pct as number }));
  if (pts.length < MIN_TREND_POINTS) return null;
  if (pts[pts.length - 1].x - pts[0].x < MIN_TREND_SPAN_DAYS) return null;
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  return (n * sxy - sx * sy) / denom;
}

/**
 * Risk is only actionable while registration is open. Other tracked states
 * (published / preparation / approved) are reported as "pending" — upcoming but
 * registration not yet open, so a low fill is expected and not a red flag.
 */
export function computeRisk(input: RiskInput, t: Thresholds, now = Date.now()): RiskResult {
  const latest = [...input.fillHistory].reverse().find((h) => h.phase3Pct != null);
  const fill = latest?.phase3Pct ?? null;

  const deadline = input.registrationDeadline ?? input.startAt;
  const deadlineSource = input.registrationDeadline
    ? "deadline"
    : input.startAt
      ? "start_date"
      : null;
  const daysToDeadline = deadline ? daysBetween(deadline, now) : null;
  const slope = trendSlope(input.fillHistory, t.trendWindow);

  const base: Omit<RiskResult, "level" | "reasons"> = {
    fill,
    daysToDeadline,
    deadline,
    deadlineSource,
    trendSlope: slope,
  };

  if (input.state !== "realization_registration_open") {
    return { ...base, level: "pending", reasons: ["Registrace ještě nespuštěna"] };
  }

  const target = deadlineSource === "start_date" ? "začátku" : "uzávěrky";

  const reasons: string[] = [];
  const isLow = fill != null && fill < t.fillThreshold;
  const declining = slope != null && slope < DECLINE_SLOPE;

  if (!isLow) {
    return { ...base, level: "none", reasons: ["Naplněnost registrace v pořádku"] };
  }
  reasons.push(`Naplněnost ${fill} % pod ${t.fillThreshold} %`);

  // Already closed (deadline passed) -> no longer actionable.
  if (daysToDeadline != null && daysToDeadline < 0) {
    return { ...base, level: "none", reasons: [...reasons, "Termín už proběhl"] };
  }

  if (daysToDeadline != null && daysToDeadline <= t.redDays) {
    reasons.push(`Zbývá jen ${days(daysToDeadline)} do ${target}`);
    return { ...base, level: "red", reasons };
  }
  if (
    (daysToDeadline != null && daysToDeadline <= t.yellowDays) ||
    declining
  ) {
    if (daysToDeadline != null && daysToDeadline <= t.yellowDays)
      reasons.push(`${days(daysToDeadline)} do ${target}`);
    if (declining) reasons.push("Naplněnost klesá");
    return { ...base, level: "yellow", reasons };
  }

  // Low fill but still far from the deadline and not declining — not yet actionable.
  return {
    ...base,
    level: "none",
    reasons: [`Naplněnost ${fill} %, ale do ${target} zbývá ${daysToDeadline ?? "?"} dní`],
  };
}
