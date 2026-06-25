import { Badge } from "@/components/ui/badge";
import { RISK_META } from "@/lib/risk-display";
import type { RiskLevel } from "@/lib/risk";

export function RiskBadge({ level }: { level: RiskLevel }) {
  const meta = RISK_META[level];
  return <Badge variant={meta.badge}>{meta.label}</Badge>;
}

export function RiskDot({ level }: { level: RiskLevel }) {
  const meta = RISK_META[level];
  return <span className={`inline-block size-2.5 rounded-full ${meta.dot}`} />;
}
