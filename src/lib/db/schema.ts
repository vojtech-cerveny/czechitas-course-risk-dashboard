import { sqliteTable, integer, text, real, index } from "drizzle-orm/sqlite-core";

// One row per IS event we track. Stable-ish attributes, upserted each scrape run.
export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey(), // IS event id
  title: text("title").notNull(),
  theme: text("theme"), // cycle / Téma
  format: text("format"), // formatPurpose / Formát
  length: text("length"), // timeAllocation / Délka
  participantGroup: text("participant_group"), // targetGroupPurpose / Účastník akce
  place: text("place"), // Místo
  month: text("month"), // Měsíc (localized label)
  year: integer("year"), // Rok / term
  startAt: text("start_at"), // ISO yyyy-mm-dd
  endAt: text("end_at"), // ISO yyyy-mm-dd
  state: text("state").notNull(), // machine state, e.g. realization_registration_open
  stateLabel: text("state_label"), // localized label as shown in IS
  capacity: integer("capacity"), // target capacity (from detail page, best-effort)
  maxCapacity: integer("max_capacity"), // maximum (from detail page, best-effort)
  registrationDeadline: text("registration_deadline"), // ISO yyyy-mm-dd, best-effort
  deadlineSource: text("deadline_source"), // 'deadline' | 'start_date'
  firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
});

// Time-series: one row per course per scrape run. This is the history the IS lacks.
export const snapshots = sqliteTable(
  "snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id),
    capturedAt: integer("captured_at", { mode: "timestamp_ms" }).notNull(),
    phase2Pct: integer("phase2_pct"), // tým
    phase3Pct: integer("phase3_pct"), // účastníci — registration fill (primary metric)
    phase4Pct: integer("phase4_pct"), // platby
    phase3Severity: text("phase3_severity"), // success|warning|danger|secondary from IS
    registeredCount: integer("registered_count"), // absolute, best-effort
    capacity: integer("capacity"), // capacity at snapshot time, best-effort
    state: text("state").notNull(),
  },
  (t) => [
    index("idx_snapshots_course").on(t.courseId),
    index("idx_snapshots_course_time").on(t.courseId, t.capturedAt),
  ],
);

// Editable risk thresholds and other key/value config.
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
