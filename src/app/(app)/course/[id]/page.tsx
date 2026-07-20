import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCourseDetail } from "@/lib/queries";
import { TrendChart, type TrendPoint } from "@/components/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { stateLabel } from "@/lib/risk-display";
import { formatDate, days } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getCourseDetail(Number(id));
  if (!detail) notFound();
  const { course, snapshots, risk, lastCapturedAt, isStale } = detail;

  const points: TrendPoint[] = snapshots.map((s) => ({
    t: s.capturedAt.getTime(),
    phase2: s.phase2Pct,
    phase3: s.phase3Pct,
    phase4: s.phase4Pct,
    registered: s.registeredCount,
  }));
  const deadlineMs = risk.deadline ? Date.parse(risk.deadline + "T00:00:00Z") : null;
  const registered = snapshots.length ? snapshots[snapshots.length - 1].registeredCount : null;

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Zpět na přehled
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">#{course.id}</Badge>
            <span>{stateLabel(course.state, course.stateLabel)}</span>
            {isStale && lastCapturedAt && (
              <span className="text-amber-600 dark:text-amber-500">
                data z {lastCapturedAt.toLocaleString("cs-CZ")}
              </span>
            )}
          </div>
        </div>
        <RiskBadge level={risk.level} />
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 lg:grid-cols-6">
          <Fact label="Registrováno" value={registered ?? "—"} />
          <Fact label="Naplněnost registrace" value={risk.fill != null ? `${risk.fill} %` : "—"} />
          <Fact
            label={risk.deadlineSource === "start_date" ? "Dní do začátku" : "Dní do uzávěrky"}
            value={risk.daysToDeadline != null ? days(risk.daysToDeadline) : "—"}
          />
          <Fact label="Začátek" value={formatDate(course.startAt)} />
          <Fact label="Konec" value={formatDate(course.endAt)} />
          <Fact label="Téma" value={course.theme ?? "—"} />
          <Fact label="Formát" value={course.format ?? "—"} />
          <Fact label="Délka" value={course.length ?? "—"} />
          <Fact label="Účastníci" value={course.participantGroup ?? "—"} />
          <Fact label="Místo" value={course.place ?? "—"} />
          <Fact label="Záznamů" value={snapshots.length} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vývoj registrací</CardTitle>
          {risk.deadlineSource === "start_date" && (
            <p className="text-xs text-muted-foreground">
              IS neuvádí žádnou explicitní uzávěrku registrace — značka ukazuje datum začátku kurzu.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {points.length >= 2 ? (
            <TrendChart
              points={points}
              deadline={deadlineMs}
              deadlineLabel={risk.deadlineSource === "start_date" ? "Začátek" : "Uzávěrka"}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Zatím není dostatek záznamů — trendová křivka se zobrazí, jakmile budou alespoň dva
              záznamy. Vraťte se po další naplánované aktualizaci.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
