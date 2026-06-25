"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Thresholds } from "@/lib/settings";

const FIELDS: { key: keyof Thresholds; label: string; hint: string }[] = [
  { key: "fillThreshold", label: "Práh nízké naplněnosti (%)", hint: "Naplněnost registrace pod touto hodnotou se považuje za nízkou." },
  { key: "redDays", label: "Červená do (dnů)", hint: "Nízká naplněnost + tolik dnů do termínu ⇒ ohrožené (červená)." },
  { key: "yellowDays", label: "Sledovat do (dnů)", hint: "Nízká naplněnost + tolik dnů do termínu ⇒ sledovat (žlutá)." },
  { key: "trendWindow", label: "Okno trendu (záznamů)", hint: "Kolik posledních záznamů se použije pro výpočet trendu." },
];

export function SettingsForm({ initial }: { initial: Thresholds }) {
  const router = useRouter();
  const [values, setValues] = React.useState<Thresholds>(initial);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    const data = await res.json();
    if (res.ok) {
      setMsg("Uloženo");
      router.refresh();
    } else {
      setMsg(data.error ?? "Uložení selhalo");
    }
  }

  return (
    <form onSubmit={save} className="max-w-lg space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <label className="text-sm font-medium" htmlFor={f.key}>
            {f.label}
          </label>
          <Input
            id={f.key}
            type="number"
            value={values[f.key]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))
            }
          />
          <p className="text-xs text-muted-foreground">{f.hint}</p>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="brand" disabled={saving}>
          {saving ? "Ukládám…" : "Uložit"}
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </form>
  );
}
