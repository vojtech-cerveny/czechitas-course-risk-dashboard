import type { RiskLevel } from "@/lib/risk";

export const RISK_META: Record<
  RiskLevel,
  { label: string; badge: "red" | "yellow" | "green" | "gray"; dot: string }
> = {
  red: { label: "Ohrožené", badge: "red", dot: "bg-red-500" },
  yellow: { label: "Sledovat", badge: "yellow", dot: "bg-amber-500" },
  none: { label: "V pořádku", badge: "green", dot: "bg-emerald-500" },
  pending: { label: "Připravované", badge: "gray", dot: "bg-muted-foreground" },
};

// State machine value -> Czech label (mirrors the IS labels).
export const STATE_LABEL: Record<string, string> = {
  realization_registration_open: "Registrace spuštěna",
  realization_published: "Publikováno",
  realization_preparation: "Příprava",
  approved: "Schváleno",
  realization_registration_closed: "Registrace ukončena",
  in_progress: "Probíhá",
  evaluation: "Vyhodnocení",
  done: "Hotovo",
  proposal: "Návrh",
  canceled_no_participants: "Zrušeno (nenaplněno)",
  canceled_others: "Zrušeno",
  rejected: "Zamítnuto",
  unknown: "—",
};

export function stateLabel(state: string, fallback?: string | null): string {
  return STATE_LABEL[state] ?? fallback ?? state;
}
