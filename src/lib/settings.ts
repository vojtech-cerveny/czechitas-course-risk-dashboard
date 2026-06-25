import { z } from "zod";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { ensureMigrated } from "@/lib/db/migrate";

export const thresholdsSchema = z.object({
  fillThreshold: z.number().min(0).max(500), // phase3 fill % below which a course is "low"
  redDays: z.number().min(0).max(365), // <= this many days to deadline => red (when low)
  yellowDays: z.number().min(0).max(365), // <= this many days to deadline => yellow (when low)
  trendWindow: z.number().min(2).max(60), // snapshots used for the trend slope
});

export type Thresholds = z.infer<typeof thresholdsSchema>;

export const DEFAULT_THRESHOLDS: Thresholds = {
  fillThreshold: 70,
  redDays: 7,
  yellowDays: 14,
  trendWindow: 5,
};

const SETTINGS_KEY = "risk.thresholds";

export function getThresholds(): Thresholds {
  ensureMigrated();
  const row = db
    .select()
    .from(settings)
    .where(eqKey(SETTINGS_KEY))
    .get();
  if (!row) return DEFAULT_THRESHOLDS;
  try {
    return thresholdsSchema.parse({ ...DEFAULT_THRESHOLDS, ...JSON.parse(row.value) });
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export function saveThresholds(input: Thresholds): Thresholds {
  ensureMigrated();
  const value = JSON.stringify(thresholdsSchema.parse(input));
  db.insert(settings)
    .values({ key: SETTINGS_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
  return input;
}

// Tiny helper to avoid importing the operator everywhere.
import { eq } from "drizzle-orm";
function eqKey(key: string) {
  return eq(settings.key, key);
}
