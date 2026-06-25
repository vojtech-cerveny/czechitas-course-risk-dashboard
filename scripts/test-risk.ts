// tsx scripts/test-risk.ts  — deterministic checks for the risk engine.
import { computeRisk } from "@/lib/risk";
import { DEFAULT_THRESHOLDS as T } from "@/lib/settings";

const DAY = 86_400_000;
const now = Date.parse("2026-06-25T12:00:00Z");
const iso = (offsetDays: number) =>
  new Date(now + offsetDays * DAY).toISOString().slice(0, 10);

let failed = 0;
function check(name: string, got: string, want: string) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}: got ${got}, want ${want}`);
}

// Open, low fill, starts in 3 days -> red
check(
  "low fill + near start",
  computeRisk(
    { state: "realization_registration_open", startAt: iso(3), registrationDeadline: null, fillHistory: [{ capturedAt: now, phase3Pct: 30 }] },
    T,
    now,
  ).level,
  "red",
);

// Open, low fill, starts in 10 days -> yellow (<=14d)
check(
  "low fill + within yellow window",
  computeRisk(
    { state: "realization_registration_open", startAt: iso(10), registrationDeadline: null, fillHistory: [{ capturedAt: now, phase3Pct: 30 }] },
    T,
    now,
  ).level,
  "yellow",
);

// Open, low fill, starts in 90 days, no trend -> none (not yet actionable)
check(
  "low fill + far out, no trend",
  computeRisk(
    { state: "realization_registration_open", startAt: iso(90), registrationDeadline: null, fillHistory: [{ capturedAt: now, phase3Pct: 30 }] },
    T,
    now,
  ).level,
  "none",
);

// Open, low fill, far out, but clearly declining over 12 days -> yellow
check(
  "low fill + declining trend",
  computeRisk(
    {
      state: "realization_registration_open",
      startAt: iso(90),
      registrationDeadline: null,
      fillHistory: [
        { capturedAt: now - 12 * DAY, phase3Pct: 50 },
        { capturedAt: now - 8 * DAY, phase3Pct: 45 },
        { capturedAt: now - 4 * DAY, phase3Pct: 38 },
        { capturedAt: now, phase3Pct: 30 },
      ],
    },
    T,
    now,
  ).level,
  "yellow",
);

// Two snapshots minutes apart (flat) must NOT read as declining -> none
check(
  "flat intra-run noise not declining",
  computeRisk(
    {
      state: "realization_registration_open",
      startAt: iso(90),
      registrationDeadline: null,
      fillHistory: [
        { capturedAt: now - 60_000, phase3Pct: 30 },
        { capturedAt: now, phase3Pct: 30 },
      ],
    },
    T,
    now,
  ).level,
  "none",
);

// On-track fill -> none
check(
  "healthy fill",
  computeRisk(
    { state: "realization_registration_open", startAt: iso(5), registrationDeadline: null, fillHistory: [{ capturedAt: now, phase3Pct: 95 }] },
    T,
    now,
  ).level,
  "none",
);

// Not-yet-open state -> pending
check(
  "published state pending",
  computeRisk(
    { state: "realization_published", startAt: iso(5), registrationDeadline: null, fillHistory: [{ capturedAt: now, phase3Pct: 10 }] },
    T,
    now,
  ).level,
  "pending",
);

// Deadline already passed -> none
check(
  "deadline passed",
  computeRisk(
    { state: "realization_registration_open", startAt: iso(-3), registrationDeadline: null, fillHistory: [{ capturedAt: now, phase3Pct: 30 }] },
    T,
    now,
  ).level,
  "none",
);

console.log(failed === 0 ? "\nALL PASSED" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
