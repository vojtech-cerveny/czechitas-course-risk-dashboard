import * as cheerio from "cheerio";
import { z } from "zod";

// Localized state label -> machine value (from the IS grid's state filter options).
export const STATE_LABEL_TO_VALUE: Record<string, string> = {
  "vyhodnocení": "evaluation",
  "probíhá": "in_progress",
  "registrace ukončena": "realization_registration_closed",
  "registrace spuštěna": "realization_registration_open",
  "publikováno": "realization_published",
  "příprava": "realization_preparation",
  "schválená": "approved",
  "návrh": "proposal",
  "hotová": "done",
  "zrušená - nenaplněná kapacita": "canceled_no_participants",
  "zrušená - ostatní": "canceled_others",
  "zamítnutá": "rejected",
};

const MONTHS: Record<string, number> = {
  leden: 1, únor: 2, březen: 3, duben: 4, květen: 5, červen: 6,
  červenec: 7, srpen: 8, září: 9, říjen: 10, listopad: 11, prosinec: 12,
};

function clean(s: string | undefined | null): string {
  return (s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

/** "17. 6. 2026" -> "2026-06-17". Returns null if unparseable. */
export function parseCzDate(raw: string | undefined | null): string | null {
  const s = clean(raw);
  const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parsePercent(raw: string | undefined | null): number | null {
  const s = clean(raw).replace(/[^\d-]/g, "");
  if (s === "") return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

const phaseSchema = z.object({
  percent: z.number().nullable(),
  severity: z.string().nullable(), // success | warning | danger | secondary
});

export const listRowSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  month: z.string().nullable(),
  startAt: z.string().nullable(),
  endAt: z.string().nullable(),
  length: z.string().nullable(),
  participantGroup: z.string().nullable(),
  theme: z.string().nullable(),
  format: z.string().nullable(),
  year: z.number().int().nullable(),
  place: z.string().nullable(),
  stateLabel: z.string().nullable(),
  state: z.string(),
  phase2: phaseSchema,
  phase3: phaseSchema,
  phase4: phaseSchema,
});

export type ListRow = z.infer<typeof listRowSchema>;

function parsePhases($: cheerio.CheerioAPI, cell: ReturnType<cheerio.CheerioAPI>) {
  const out = {
    phase2: { percent: null as number | null, severity: null as string | null },
    phase3: { percent: null as number | null, severity: null as string | null },
    phase4: { percent: null as number | null, severity: null as string | null },
  };
  cell.find("div[title]").each((_, el) => {
    const $el = $(el);
    const title = clean($el.attr("title"));
    const cls = $el.attr("class") ?? "";
    const severity = cls.match(/bg-(\w+)/)?.[1] ?? null;
    const percent = parsePercent($el.text());
    const key = title.includes("Fáze 2")
      ? "phase2"
      : title.includes("Fáze 3")
        ? "phase3"
        : title.includes("Fáze 4")
          ? "phase4"
          : null;
    if (key) out[key] = { percent, severity };
  });
  return out;
}

/** Parse the event list grid HTML into typed rows. */
export function parseEventList(html: string): ListRow[] {
  const $ = cheerio.load(html);
  const rows: ListRow[] = [];
  $("tr[data-id]").each((_, tr) => {
    const $tr = $(tr);
    const id = Number.parseInt($tr.attr("data-id") ?? "", 10);
    if (!Number.isFinite(id)) return;
    const col = (name: string) => $tr.find(`td.col-${name}`);
    const stateLabel = clean(col("state").text()) || null;
    const phases = parsePhases($, col("stage1Level"));
    const yearText = clean(col("term").text());
    const year = yearText ? Number.parseInt(yearText, 10) : null;
    rows.push({
      id,
      title: clean(col("title").text()),
      month: clean(col("month").text()) || null,
      startAt: parseCzDate(col("startAt").text()),
      endAt: parseCzDate(col("endAt").text()),
      length: clean(col("timeAllocation").text()) || null,
      participantGroup: clean(col("targetGroupPurpose").text()) || null,
      theme: clean(col("cycle").text()) || null,
      format: clean(col("formatPurpose").text()) || null,
      year: Number.isFinite(year as number) ? (year as number) : null,
      place: clean(col("place").text()) || null,
      stateLabel,
      state: (stateLabel && STATE_LABEL_TO_VALUE[stateLabel]) || "unknown",
      ...phases,
    });
  });
  return rows;
}

/** Total number of grid pages, parsed from the pagination control (best-effort). */
export function parsePageCount(html: string): number {
  const matches = [...html.matchAll(/list-grid-page=(\d+)/g)].map((m) =>
    Number.parseInt(m[1], 10),
  );
  return matches.length ? Math.max(...matches) : 1;
}

/**
 * Parse the "Statistika stavu účastníků" block on the participant list tab into a
 * map of status label -> count, e.g. { "Přijatý": 5, "Zrušený účastníkem": 2 }.
 */
export function parseParticipantStats(html: string): Record<string, number> {
  const $ = cheerio.load(html);
  const stats: Record<string, number> = {};
  // Each status is a <span class="btn ...">Label <span class="badge">N</span></span>.
  $("span.badge").each((_, badge) => {
    const $badge = $(badge);
    const n = parsePercent($badge.text());
    if (n == null) return;
    const $btn = $badge.closest(".btn"); // the status pill wrapping the badge
    if (!$btn.length) return;
    // label = the pill's text minus the badge number
    const label = clean($btn.clone().children().remove().end().text());
    if (label) stats[label] = n;
  });
  return stats;
}

/** Registered headcount = accepted participants ("Přijatý"), the number the fill % tracks. */
export function registeredFromStats(stats: Record<string, number>): number | null {
  const accepted = stats["Přijatý"] ?? stats["Přijatá"] ?? stats["Přijato"];
  return accepted ?? null;
}

export interface DetailFields {
  capacity: number | null;
  maxCapacity: number | null;
  registeredCount: number | null;
  registrationDeadline: string | null; // ISO yyyy-mm-dd
}

/**
 * Best-effort extraction of capacity / head-count / registration deadline from a
 * detail page. The IS layout for these fields is not fully confirmed, so this scans
 * labelled rows defensively and returns nulls for anything not found.
 */
export function parseEventDetail(html: string): DetailFields {
  const $ = cheerio.load(html);
  const out: DetailFields = {
    capacity: null,
    maxCapacity: null,
    registeredCount: null,
    registrationDeadline: null,
  };

  // Strategy: walk label/value pairs (dl, table rows, form groups) and match by label text.
  const consider = (labelRaw: string, valueRaw: string) => {
    const label = clean(labelRaw).toLowerCase();
    const value = clean(valueRaw);
    if (!label || !value) return;
    const num = parsePercent(value);
    const date = parseCzDate(value) ?? (/\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null);
    if (/(uz[aá]v[eě]rk|p[rř]ihl[aá][sš].*\bdo\b|registrace\s*do|deadline)/.test(label) && date) {
      out.registrationDeadline ??= date;
    } else if (/maxim/.test(label) && num !== null) {
      out.maxCapacity ??= num;
    } else if (/kapacit/.test(label) && num !== null) {
      out.capacity ??= num;
    } else if (/(p[rř]ihl[aá][sš]|registrovan|ú[cč]astn[ií]k|obsazen)/.test(label) && num !== null) {
      out.registeredCount ??= num;
    }
  };

  $("dl").each((_, dl) => {
    const dts = $(dl).find("dt");
    const dds = $(dl).find("dd");
    dts.each((i, dt) => consider($(dt).text(), $(dds[i]).text()));
  });
  $("tr").each((_, tr) => {
    const cells = $(tr).find("th,td");
    if (cells.length >= 2) consider($(cells[0]).text(), $(cells[1]).text());
  });
  $(".form-group, .row").each((_, g) => {
    const label = $(g).find("label").first().text();
    const value =
      $(g).find("input").first().attr("value") ??
      $(g).find(".form-control-plaintext, .col-form-label, span").first().text();
    if (label && value) consider(label, value);
  });

  return out;
}
