import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an ISO yyyy-mm-dd as a Czech-style date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

/** Czech plural for "day": 1 → den, 2–4 → dny, else → dní. */
export function dayWord(n: number): string {
  const abs = Math.abs(n);
  if (abs === 1) return "den";
  if (abs >= 2 && abs <= 4) return "dny";
  return "dní";
}

/** "5 dní", "1 den", "3 dny". */
export function days(n: number): string {
  return `${n} ${dayWord(n)}`;
}
