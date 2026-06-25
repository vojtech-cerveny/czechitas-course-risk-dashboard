import { getThresholds } from "@/lib/settings";
import { SettingsForm } from "@/components/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const thresholds = getThresholds();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nastavení rizik</h1>
        <p className="text-sm text-muted-foreground">
          Nastavte, kdy se kurz označí žlutě nebo červeně. Projeví se v celém přehledu okamžitě.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Prahové hodnoty</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm initial={thresholds} />
        </CardContent>
      </Card>
    </div>
  );
}
