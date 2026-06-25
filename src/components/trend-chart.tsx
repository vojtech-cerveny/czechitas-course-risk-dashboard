"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-date-fns";
import { cs } from "date-fns/locale";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
);

export interface TrendPoint {
  t: number; // ms
  phase2: number | null;
  phase3: number | null;
  phase4: number | null;
}

export function TrendChart({
  points,
  deadline,
  deadlineLabel,
}: {
  points: TrendPoint[];
  deadline: number | null; // ms
  deadlineLabel: string;
}) {
  const data = {
    datasets: [
      {
        label: "Registrace (Fáze 3)",
        data: points.map((p) => ({ x: p.t, y: p.phase3 })),
        borderColor: "oklch(0.62 0.24 1.6)",
        backgroundColor: "oklch(0.62 0.24 1.6 / 0.12)",
        fill: true,
        tension: 0.25,
        spanGaps: true,
        pointRadius: 3,
      },
      {
        label: "Tým (Fáze 2)",
        data: points.map((p) => ({ x: p.t, y: p.phase2 })),
        borderColor: "oklch(0.6 0.13 200)",
        borderDash: [4, 4],
        fill: false,
        tension: 0.25,
        spanGaps: true,
        pointRadius: 0,
      },
      {
        label: "Platby (Fáze 4)",
        data: points.map((p) => ({ x: p.t, y: p.phase4 })),
        borderColor: "oklch(0.7 0.15 145)",
        borderDash: [4, 4],
        fill: false,
        tension: 0.25,
        spanGaps: true,
        pointRadius: 0,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        type: "time",
        time: { unit: "day", tooltipFormat: "d. M. yyyy", displayFormats: { day: "d. M." } },
        adapters: { date: { locale: cs } },
        grid: { display: false },
      },
      y: { beginAtZero: true, ticks: { callback: (v) => `${v}%` } },
    },
    plugins: {
      legend: { position: "bottom" },
      annotation: deadline
        ? {
            annotations: {
              deadline: {
                type: "line",
                xMin: deadline,
                xMax: deadline,
                borderColor: "oklch(0.577 0.245 27.325)",
                borderWidth: 2,
                borderDash: [6, 4],
                label: {
                  display: true,
                  content: deadlineLabel,
                  position: "start",
                  backgroundColor: "oklch(0.577 0.245 27.325)",
                  color: "#fff",
                  font: { size: 10 },
                },
              },
            },
          }
        : undefined,
    },
  };

  return (
    <div className="h-80">
      <Line data={data} options={options} />
    </div>
  );
}
