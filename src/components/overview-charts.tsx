"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { cs } from "date-fns/locale";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
);

const RED = "oklch(0.577 0.245 27.325)";
const AMBER = "oklch(0.75 0.16 75)";
const BRAND = "oklch(0.62 0.24 1.6)";

export function RiskOverTimeChart({
  data,
}: {
  data: { date: string; red: number; yellow: number }[];
}) {
  if (data.length < 2) {
    return <p className="text-sm text-muted-foreground">Zatím není dostatek historie — trend se vytvoří v následujících dnech.</p>;
  }
  const chart = {
    datasets: [
      {
        label: "Ohrožené",
        data: data.map((d) => ({ x: Date.parse(d.date), y: d.red })),
        borderColor: RED,
        backgroundColor: `${RED.slice(0, -1)} / 0.12)`,
        fill: true,
        tension: 0.25,
        pointRadius: 2,
      },
      {
        label: "Sledovat",
        data: data.map((d) => ({ x: Date.parse(d.date), y: d.yellow })),
        borderColor: AMBER,
        fill: false,
        tension: 0.25,
        pointRadius: 2,
      },
    ],
  };
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        type: "time",
        time: { unit: "day", tooltipFormat: "d. M. yyyy", displayFormats: { day: "d. M." } },
        adapters: { date: { locale: cs } },
        grid: { display: false },
      },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
    plugins: { legend: { position: "bottom" } },
  };
  return (
    <div className="h-72">
      <Line data={chart} options={options} />
    </div>
  );
}

export function FillByThemeChart({
  data,
}: {
  data: { theme: string; avgFill: number; registered: number; count: number }[];
}) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Zatím žádné kurzy s otevřenou registrací k agregaci.</p>;
  }
  const chart = {
    labels: data.map((d) => `${d.theme} (${d.count})`),
    datasets: [
      {
        label: "Průměrná naplněnost registrace %",
        data: data.map((d) => d.avgFill),
        backgroundColor: data.map((d) =>
          d.avgFill >= 70 ? "oklch(0.7 0.15 145)" : d.avgFill >= 40 ? AMBER : RED,
        ),
        borderRadius: 4,
      },
    ],
  };
  const options: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: { x: { beginAtZero: true, ticks: { callback: (v) => `${v}%` } } },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterLabel: (ctx) => `${data[ctx.dataIndex].registered} registrovaných`,
        },
      },
    },
  };
  return (
    <div style={{ height: Math.max(200, data.length * 34) }}>
      <Bar data={chart} options={options} />
    </div>
  );
}

void BRAND;
