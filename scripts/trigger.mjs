#!/usr/bin/env node
// Triggers a scrape by POSTing to the running app's /api/update.
// Plain Node (no deps, no tsx) so it works inside the production Docker image.
// Used by the Coolify Scheduled Task:  node scripts/trigger.mjs
//
// Env:
//   UPDATE_TOKEN  (required) — must match the server's token
//   SELF_URL      (optional) — base URL, default http://127.0.0.1:$PORT
//   PORT          (optional) — default 3000

const token = process.env.UPDATE_TOKEN;
if (!token) {
  console.error("trigger: UPDATE_TOKEN is not set");
  process.exit(2);
}

const base = process.env.SELF_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;
const url = `${base.replace(/\/$/, "")}/api/update`;

try {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(290_000),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`trigger: HTTP ${res.status} — ${text}`);
    process.exit(1);
  }
  console.log(`trigger: ${text}`);
} catch (err) {
  console.error(`trigger: request failed — ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
