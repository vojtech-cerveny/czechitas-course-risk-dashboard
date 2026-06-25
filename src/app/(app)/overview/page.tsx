import { getOverviewStats } from "@/lib/queries";
import { RiskOverTimeChart, FillByThemeChart } from "@/components/overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const stats = getOverviewStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Souhrnný přehled</h1>
        <p className="text-sm text-muted-foreground">
          {stats.total} sledovaných kurzů
          {stats.lastCapturedAt
            ? ` · poslední aktualizace ${new Date(stats.lastCapturedAt).toLocaleString("cs-CZ")}`
            : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rizikové kurzy v čase</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskOverTimeChart data={stats.riskOverTime} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Průměrná naplněnost registrace podle tématu</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pouze kurzy s otevřenou registrací. Nižší hodnoty = témata zaostávající v přihláškách.
          </p>
        </CardHeader>
        <CardContent>
          <FillByThemeChart data={stats.fillByTheme} />
        </CardContent>
      </Card>
    </div>
  );
}
