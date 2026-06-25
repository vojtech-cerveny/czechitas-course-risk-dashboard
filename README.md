# Course Risk Dashboard (`is-bot`)

Registration-trend dashboard for Czechitas marketing. The internal system (IS) at
`is.czechitas.cz` shows only the **current** state of each course and keeps **no history**,
so nobody sees when a course has low sign-ups and registration is about to close. This app
**scrapes the IS on a schedule**, stores **time-series snapshots** in SQLite, and surfaces:

- a **risk dashboard** — courses that are low on registrations and closing soon,
- a **filterable / sortable table** of all tracked courses,
- a **per-course trend chart** (registration fill over time), and
- a **portfolio overview** (risky-over-time + average fill by theme).

There is **no IS API** (it requires a separately-provisioned key the account doesn't have),
so data is collected by authenticated HTTP scraping of the server-rendered event grid.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn-style UI · TanStack Table ·
Chart.js · Drizzle ORM + better-sqlite3 · zod. One Docker container on Coolify.

## How it works

- **Scraper** (`src/lib/scraper`) logs in via the Nette CSRF form, then reads the
  `/cs/event/event/list` grid filtered to open/upcoming states. The list page carries
  everything needed: course meta, dates, state, and the three "Indikace zdrojů" phase
  percentages — **Fáze 3 (účastníci) is the registration fill**, the primary risk metric.
- The IS exposes **no explicit registration deadline**, so the **course start date** is used
  as the deadline proxy for the "closes in N days" countdown (labelled as such in the UI).
- **`POST /api/update?token=…`** runs one scrape and writes a snapshot row per course
  (token-protected, with an in-process lock so overlapping runs can't double-write).
  Logged-in users can also trigger it from the UI ("Update now" → `POST /api/refresh`).
- **Risk engine** (`src/lib/risk.ts`): a course is **red** when fill is below the threshold
  and the deadline is within `redDays`; **yellow** when within `yellowDays` or the fill is
  clearly declining; **pending** while registration isn't open yet. Thresholds are editable
  at `/settings`.

## Local development

```bash
cp .env.example .env.local      # fill in IS_LOGIN / IS_PASSWORD / APP_PASSWORD / tokens
npm install
npm run db:generate             # (only after changing src/lib/db/schema.ts)
npm run scrape                  # pull a first batch from the IS into ./data/is-bot.sqlite
npm run dev                     # http://localhost:3000  (sign in with APP_PASSWORD)
```

Useful scripts: `npm run test:risk` (risk-engine checks), `npm run seed:demo`
(insert demo courses with history to exercise the UI), `npm run scrape`.

## Deploy on Coolify

1. **New Resource → Dockerfile** from this repo. Coolify builds the included `Dockerfile`
   (standalone Next output; the app listens on port **3000**).
2. **Persistent storage:** add a volume mounted at **`/data`** (the SQLite file lives there
   and must survive redeploys).
3. **Environment variables:** set `IS_LOGIN`, `IS_PASSWORD`, `UPDATE_TOKEN`, `APP_PASSWORD`,
   `AUTH_SECRET`, and `DATABASE_PATH=/data/is-bot.sqlite`.
4. **Scheduled task** (Coolify → Scheduled Tasks) to scrape 1–2×/day, e.g. daily at 06:00:
   ```
   curl -fsS -X POST "https://<your-app-domain>/api/update?token=$UPDATE_TOKEN"
   ```
   Migrations run automatically on first request/scrape; no manual migration step.

> History accrues from the first scrape onward — the IS has no past data to backfill, so
> trend charts fill in over the following days.

## Environment variables

| Var | Purpose |
| --- | --- |
| `IS_BASE_URL` | IS base URL (default `https://is.czechitas.cz`) |
| `IS_LOGIN` / `IS_PASSWORD` | IS account used by the scraper |
| `UPDATE_TOKEN` | Secret for the scheduled `/api/update` trigger |
| `APP_PASSWORD` | Shared password to open the dashboard |
| `AUTH_SECRET` | Signs the session cookie (≥32 random chars; defaults to `APP_PASSWORD`) |
| `DATABASE_PATH` | SQLite file path (`/data/is-bot.sqlite` in Docker) |
