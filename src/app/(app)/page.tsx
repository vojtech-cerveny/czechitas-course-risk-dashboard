import Link from "next/link";
import { getCoursesWithRisk, type CourseWithRisk } from "@/lib/queries";
import { CoursesTable, type CourseTableRow } from "@/components/courses-table";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/risk-badge";
import { Sparkline } from "@/components/sparkline";
import { RefreshButton } from "@/components/refresh-button";
import { RISK_META, stateLabel } from "@/lib/risk-display";
import { formatDate, days } from "@/lib/utils";

export const dynamic = "force-dynamic";

function toRow(c: CourseWithRisk): CourseTableRow {
  return {
    id: c.course.id,
    title: c.course.title,
    theme: c.course.theme,
    format: c.course.format,
    length: c.course.length,
    place: c.course.place,
    startAt: c.course.startAt,
    state: c.course.state,
    fill: c.risk.fill,
    registered: c.registered,
    phase2: c.latest?.phase2Pct ?? null,
    phase4: c.latest?.phase4Pct ?? null,
    riskLevel: c.risk.level,
    daysToDeadline: c.risk.daysToDeadline,
    spark: c.history.map((h) => h.phase3Pct),
  };
}

function SummaryCard({ label, value, level }: { label: string; value: number; level: keyof typeof RISK_META }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
        <span className={`size-3 rounded-full ${RISK_META[level].dot}`} />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const rows = getCoursesWithRisk();
  const counts = { red: 0, yellow: 0, none: 0, pending: 0 };
  for (const r of rows) counts[r.risk.level]++;

  const attention = rows.filter((r) => r.risk.level === "red" || r.risk.level === "yellow");
  const lastCaptured = rows
    .map((r) => r.latest?.capturedAt)
    .filter(Boolean)
    .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0];

  const hasData = rows.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Přehled rizik kurzů</h1>
          <p className="text-sm text-muted-foreground">
            {lastCaptured
              ? `Naposledy aktualizováno ${lastCaptured.toLocaleString("cs-CZ")}`
              : "Zatím žádná data — spusťte aktualizaci pro načtení z IS."}
          </p>
        </div>
        <RefreshButton />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Zatím nejsou uložené žádné kurzy. Klikněte na <strong>Aktualizovat</strong> pro první
            načtení z IS. Trendy se začnou tvořit v následujících dnech.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Ohrožené" value={counts.red} level="red" />
            <SummaryCard label="Sledovat" value={counts.yellow} level="yellow" />
            <SummaryCard label="V pořádku" value={counts.none} level="none" />
            <SummaryCard label="Připravované" value={counts.pending} level="pending" />
          </div>

          {attention.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Vyžaduje pozornost</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {attention.slice(0, 6).map((c) => (
                  <Card key={c.course.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/course/${c.course.id}`}
                          className="font-medium leading-tight text-brand hover:underline"
                        >
                          {c.course.title}
                        </Link>
                        <RiskBadge level={c.risk.level} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {stateLabel(c.course.state)} · {formatDate(c.course.startAt)}
                        </div>
                        <Sparkline values={c.history.map((h) => h.phase3Pct)} />
                      </div>
                      <div className="flex items-baseline gap-3 text-sm">
                        <span>
                          <strong className="tabular-nums">{c.registered ?? "—"}</strong> registrovaných
                        </span>
                        <span className="text-muted-foreground">
                          Naplněnost <span className="tabular-nums">{c.risk.fill ?? "—"} %</span>
                        </span>
                        {c.risk.daysToDeadline != null && c.risk.daysToDeadline >= 0 && (
                          <span>
                            zbývá <strong className="tabular-nums">{days(c.risk.daysToDeadline)}</strong>
                          </span>
                        )}
                      </div>
                      {c.risk.reasons.length > 0 && (
                        <p className="text-xs text-muted-foreground">{c.risk.reasons.join(" · ")}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Všechny sledované kurzy</h2>
            <CoursesTable rows={rows.map(toRow)} />
          </section>
        </>
      )}
    </div>
  );
}
