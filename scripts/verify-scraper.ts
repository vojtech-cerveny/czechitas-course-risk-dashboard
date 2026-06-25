// Manual verification harness: tsx --env-file=.env.local scripts/verify-scraper.ts
import { IsClient } from "@/lib/scraper/client";
import { fetchEventList, fetchEventDetail } from "@/lib/scraper";
import { parseEventDetail } from "@/lib/scraper/parse";

async function main() {
  const client = new IsClient();
  console.log("Logging in…");
  await client.login();
  console.log("✓ logged in");

  console.log("\nFetching registration_open list…");
  const open = await fetchEventList(client, "realization_registration_open");
  console.log(`✓ ${open.length} open-registration courses`);
  for (const r of open.slice(0, 3)) {
    console.log(
      `  #${r.id} "${r.title}" start=${r.startAt} state=${r.state} ` +
        `phase3(fill)=${r.phase3.percent}% (${r.phase3.severity})`,
    );
  }

  const sample = open[0];
  if (sample) {
    console.log(`\nFetching detail for #${sample.id}…`);
    const detail = await fetchEventDetail(client, sample.id);
    console.log("  parsed detail:", detail);

    // Dump candidate label/value pairs to help locate the deadline field.
    const html = await client.get(`/cs/event/event/edit/${sample.id}`);
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    console.log("\n  candidate labels mentioning deadline/capacity/registration:");
    $("label, dt, th, .col-form-label").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (/uz[aá]v|p[rř]ihl|kapacit|maxim|registr|ú[cč]astn|obsazen|term/i.test(t) && t.length < 60) {
        console.log(`    - "${t}"`);
      }
    });
    void parseEventDetail;
  }
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
