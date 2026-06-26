"use client";

import * as React from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RISK_META, stateLabel } from "@/lib/risk-display";
import { Sparkline } from "@/components/sparkline";
import { formatDate, days } from "@/lib/utils";
import type { RiskLevel } from "@/lib/risk";

export interface CourseTableRow {
  id: number;
  title: string;
  theme: string | null;
  format: string | null;
  length: string | null;
  place: string | null;
  startAt: string | null;
  state: string;
  fill: number | null;
  registered: number | null;
  phase2: number | null;
  phase4: number | null;
  riskLevel: RiskLevel;
  daysToDeadline: number | null;
  spark: (number | null)[];
}

function fillCell(v: number | null) {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  const color =
    v >= 100
      ? "text-emerald-600 dark:text-emerald-400"
      : v >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return <span className={`font-medium tabular-nums ${color}`}>{v}%</span>;
}

export function CoursesTable({ rows }: { rows: CourseTableRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [stateFilter, setStateFilter] = React.useState("");
  const [riskFilter, setRiskFilter] = React.useState("");

  const states = React.useMemo(
    () => [...new Set(rows.map((r) => r.state))].sort(),
    [rows],
  );

  const columns = React.useMemo<ColumnDef<CourseTableRow>[]>(
    () => [
      {
        accessorKey: "riskLevel",
        header: "Riziko",
        cell: ({ getValue }) => {
          const lvl = getValue<RiskLevel>();
          return <Badge variant={RISK_META[lvl].badge}>{RISK_META[lvl].label}</Badge>;
        },
        sortingFn: (a, b) => {
          const order: Record<string, number> = { red: 0, yellow: 1, none: 2, pending: 3 };
          return order[a.original.riskLevel] - order[b.original.riskLevel];
        },
      },
      {
        accessorKey: "title",
        header: "Kurz",
        cell: ({ row }) => (
          <Link
            href={`/course/${row.original.id}`}
            className="font-medium text-brand hover:underline"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: "registered",
        header: "Registrováno",
        cell: ({ getValue }) => {
          const n = getValue<number | null>();
          return n == null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-medium tabular-nums">{n}</span>
          );
        },
      },
      { accessorKey: "fill", header: "Naplněnost", cell: ({ getValue }) => fillCell(getValue<number | null>()) },
      {
        id: "trend",
        header: "Trend",
        enableSorting: false,
        cell: ({ row }) => <Sparkline values={row.original.spark} width={72} height={22} />,
      },
      {
        accessorKey: "daysToDeadline",
        header: "Zbývá",
        cell: ({ getValue }) => {
          const d = getValue<number | null>();
          if (d == null) return <span className="text-muted-foreground">—</span>;
          if (d < 0) return <span className="text-muted-foreground">uzavřeno</span>;
          return (
            <span className={d <= 7 ? "font-medium text-red-600 dark:text-red-400" : "tabular-nums"}>
              {days(d)}
            </span>
          );
        },
      },
      {
        accessorKey: "startAt",
        header: "Začátek",
        cell: ({ getValue }) => formatDate(getValue<string | null>()),
      },
      {
        accessorKey: "state",
        header: "Stav",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{stateLabel(getValue<string>())}</span>
        ),
      },
      { accessorKey: "theme", header: "Téma", cell: ({ getValue }) => getValue<string>() ?? "—" },
      { accessorKey: "format", header: "Formát", cell: ({ getValue }) => getValue<string>() ?? "—" },
      { accessorKey: "place", header: "Místo", cell: ({ getValue }) => getValue<string>() ?? "—" },
    ],
    [],
  );

  const filtered = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          (!stateFilter || r.state === stateFilter) &&
          (!riskFilter || r.riskLevel === riskFilter),
      ),
    [rows, stateFilter, riskFilter],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Hledat kurzy…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="w-44">
          <option value="">Všechna rizika</option>
          <option value="red">Ohrožené</option>
          <option value="yellow">Sledovat</option>
          <option value="none">V pořádku</option>
          <option value="pending">Připravované</option>
        </Select>
        <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="w-56">
          <option value="">Všechny stavy</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {stateLabel(s)}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {table.getRowModel().rows.length} z {rows.length}
        </span>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {canSort ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Žádné kurzy neodpovídají.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
