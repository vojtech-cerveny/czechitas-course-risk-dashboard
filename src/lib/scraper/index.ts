import { IsClient } from "./client";
import {
  parseEventList,
  parseEventDetail,
  parseParticipantStats,
  registeredFromStats,
  type ListRow,
  type DetailFields,
} from "./parse";
import { TRACKED_STATES, FOLLOWUP_STATES } from "@/lib/env";

export interface ScrapedCourse {
  row: ListRow;
  detail: DetailFields;
}

export interface ScrapeResult {
  capturedAt: Date;
  courses: ScrapedCourse[];
}

function listUrl(state: string, page: number): string {
  const params = new URLSearchParams();
  params.set("list-grid-filter[state]", state);
  if (page > 1) params.set("list-grid-page", String(page));
  return `/cs/event/event/list?${params.toString()}`;
}

/** Fetch all rows for a given state, paginating until a page returns no new ids. */
export async function fetchEventList(
  client: IsClient,
  state: string,
  maxPages = 40,
): Promise<ListRow[]> {
  const all: ListRow[] = [];
  const seen = new Set<number>();
  for (let page = 1; page <= maxPages; page++) {
    const html = await client.get(listUrl(state, page));
    const rows = parseEventList(html).filter((r) => r.state === state);
    const fresh = rows.filter((r) => !seen.has(r.id));
    if (fresh.length === 0) break; // no new rows -> past the last page (or filter ignored)
    for (const r of fresh) {
      seen.add(r.id);
      all.push(r);
    }
    if (rows.length < 20) break; // last (partial) page
  }
  return all;
}

export async function fetchEventDetail(
  client: IsClient,
  id: number,
): Promise<DetailFields> {
  const html = await client.get(`/cs/event/event/edit/${id}`);
  return parseEventDetail(html);
}

/**
 * Absolute registered headcount = accepted participants ("Přijatý") from the
 * participant-list tab's status statistics. This is the only reliably-exposed
 * absolute number (the IS keeps no consistent capacity), and it drives the fill %.
 */
export async function fetchRegisteredCount(
  client: IsClient,
  id: number,
): Promise<number | null> {
  const html = await client.get(`/cs/event/event/edit/${id}/eventParticipantList`);
  return registeredFromStats(parseParticipantStats(html));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const emptyDetail = (): DetailFields => ({
  capacity: null,
  maxCapacity: null,
  registeredCount: null,
  registrationDeadline: null,
});

/**
 * Full scrape: login -> tracked-state lists -> per-course registered headcount.
 *
 * The list page carries the meta, dates, state, and the three phase %s (Fáze 3 =
 * registration fill). For each course we additionally fetch the participant-list tab
 * to read the absolute accepted count. Set `counts: false` to skip that (list-only).
 *
 * `knownIds` (course ids already in our DB) enables the follow-up sweep: known
 * courses missing from the tracked lists are looked up in FOLLOWUP_STATES so their
 * state label and registered count keep updating after registration closes.
 */
export async function scrapeAll(
  opts: { counts?: boolean; delayMs?: number; knownIds?: number[] } = {},
): Promise<ScrapeResult> {
  const { counts = true, delayMs = 200, knownIds = [] } = opts;
  const client = new IsClient();
  await client.login();

  const byId = new Map<number, ListRow>();
  for (const state of TRACKED_STATES) {
    const rows = await fetchEventList(client, state);
    for (const r of rows) byId.set(r.id, r);
  }

  // Follow-up sweep for previously-seen courses that left the tracked states.
  const missing = new Set(knownIds.filter((id) => !byId.has(id)));
  if (missing.size) {
    for (const state of FOLLOWUP_STATES) {
      const rows = await fetchEventList(client, state);
      for (const r of rows) {
        if (missing.has(r.id)) byId.set(r.id, r);
      }
    }
  }

  const courses: ScrapedCourse[] = [];
  for (const row of byId.values()) {
    const detail = emptyDetail();
    if (counts) {
      try {
        detail.registeredCount = await fetchRegisteredCount(client, row.id);
      } catch {
        // best-effort; leave registeredCount null on failure
      }
      if (delayMs) await sleep(delayMs);
    }
    courses.push({ row, detail });
  }

  return { capturedAt: new Date(), courses };
}
