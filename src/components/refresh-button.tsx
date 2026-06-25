"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function refresh() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Aktualizováno: ${data.coursesSeen} kurzů`);
        router.refresh();
      } else {
        setMsg(data.error ?? "Aktualizace selhala");
      }
    } catch {
      setMsg("Aktualizace selhala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
        <RefreshCw className={loading ? "animate-spin" : ""} />
        {loading ? "Aktualizuji…" : "Aktualizovat"}
      </Button>
    </div>
  );
}
