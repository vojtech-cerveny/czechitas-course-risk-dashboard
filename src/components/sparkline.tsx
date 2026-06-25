// Pure SVG sparkline — no client JS, safe in server components and cheap per-card.
export function Sparkline({
  values,
  width = 96,
  height = 28,
  className = "text-brand",
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const pts = values.filter((v): v is number => v != null);
  if (pts.length < 2) {
    return <span className="text-xs text-muted-foreground">trend pending</span>;
  }
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const stepX = width / (pts.length - 1);
  const d = pts
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = pts[pts.length - 1];
  const lastX = (pts.length - 1) * stepX;
  const lastY = height - ((last - min) / span) * height;
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx={lastX} cy={lastY} r={2} fill="currentColor" />
    </svg>
  );
}
