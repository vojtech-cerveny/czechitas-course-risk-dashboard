"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LineChart, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Přehled" },
  { href: "/overview", label: "Statistiky" },
  { href: "/settings", label: "Nastavení" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <LineChart className="size-4" />
          </span>
          <span className="hidden sm:inline">Rizika kurzů</span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Odhlásit se</span>
        </button>
      </div>
    </header>
  );
}
