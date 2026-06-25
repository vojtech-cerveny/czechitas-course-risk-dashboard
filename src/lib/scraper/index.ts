import { IsClient } from "./client";
import {
  parseEventList,
  parseEventDetail,
  type ListRow,
  type DetailFields,
} from "./parse";
import { TRACKED_STATES } from "@/lib/env";

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Full scrape: login -> tracked-state lists (-> optional per-course detail).
 *
 * The list page carries everything v1 needs (dates, state, the three phase %s incl.
 * registration fill). The IS exposes no explicit registration deadline, so we proxy it
 * from the course start date downstream. Detail pages are heavy and parse unreliably, so
 * `detail` defaults to off; enable it only to attempt absolute capacity/head-count.
 */
export async function scrapeAll(
  opts: { detail?: boolean; detailDelayMs?: number } = {},
): Promise<ScrapeResult> {
  const { detail = false, detailDelayMs = 250 } = opts;
  const client = new IsClient();
  await client.login();

  const byId = new Map<number, ListRow>();
  for (const state of TRACKED_STATES) {
    const rows = await fetchEventList(client, state);
    for (const r of rows) byId.set(r.id, r);
  }

  const courses: ScrapedCourse[] = [];
  for (const row of byId.values()) {
    let detailFields: DetailFields = {
      capacity: null,
      maxCapacity: null,
      registeredCount: null,
      registrationDeadline: null,
    };
    if (detail) {
      try {
        detailFields = await fetchEventDetail(client, row.id);
      } catch {
        // best-effort; keep nulls on failure
      }
      if (detailDelayMs) await sleep(detailDelayMs);
    }
    courses.push({ row, detail: detailFields });
  }

  return { capturedAt: new Date(), courses };
}
