"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/calc/chart-scale";
import { useWidth, type ChartSeries } from "./chart-card";

type Props = { categories: string[]; series: ChartSeries[]; height?: number; yFormat?: (v: number) => string };

const PAD = { top: 18, right: 8, bottom: 26, left: 36 };
const BAR_MAX = 24;
const GAP = 2;

/** Kolom berkelompok: tebal ≤ 24px, ujung data membulat 4px, jarak 2px antar kolom, tooltip per kolom. */
export function BarChart({ categories, series, height = 220, yFormat = (v) => String(v) }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ c: number; s: number } | null>(null);
  const max = Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const band = categories.length ? w / categories.length : w;
  const bar = Math.max(4, Math.min(BAR_MAX, (band * 0.7 - GAP * (series.length - 1)) / series.length));
  const group = bar * series.length + GAP * (series.length - 1);
  const py = (v: number) => PAD.top + h - (v / top) * h;
  const bx = (c: number, s: number) => PAD.left + c * band + (band - group) / 2 + s * (bar + GAP);

  /** Kolom dengan ujung atas membulat 4px dan dasar persegi. */
  const colPath = (x: number, v: number) => {
    const y = py(v);
    const r = Math.min(4, bar / 2, PAD.top + h - y);
    const base = PAD.top + h;
    return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + bar - r}Q${x + bar},${y} ${x + bar},${y + r}V${base}Z`;
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => s.label).join(", ")}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + w} y1={py(t)} y2={py(t)} stroke="var(--chart-grid)" strokeWidth="1" />
              <text x={PAD.left - 8} y={py(t)} dy="0.32em" textAnchor="end" className="fill-[var(--text-tertiary)] font-mono text-[10px]">{yFormat(t)}</text>
            </g>
          ))}
          {categories.map((cat, c) => (
            <g key={cat}>
              <text x={PAD.left + c * band + band / 2} y={height - 8} textAnchor="middle" className="fill-[var(--text-tertiary)] font-mono text-[10px]">{cat}</text>
              {series.map((s, si) => {
                const v = s.values[c];
                if (v === null || v === undefined) return null;
                const x = bx(c, si);
                const active = hover?.c === c && hover.s === si;
                return (
                  <g key={s.key} onPointerEnter={() => setHover({ c, s: si })} onPointerLeave={() => setHover(null)}>
                    {/* Area sentuh lebih besar dari kolomnya. */}
                    <rect x={x - 2} y={PAD.top} width={bar + 4} height={h} fill="transparent" />
                    {v > 0 && <path d={colPath(x, v)} fill={s.color} opacity={hover && !active ? 0.55 : 1} />}
                    {bar >= 14 && <text x={x + bar / 2} y={py(v) - 5} textAnchor="middle" className="fill-[var(--text-secondary)] font-mono text-[10px]">{yFormat(v)}</text>}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      )}
      {hover && width > 0 && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-xs bg-overlay px-3 py-2 text-xs shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-md)] backdrop-blur-xl"
          style={{ left: Math.min(width - 160, Math.max(0, bx(hover.c, hover.s) - 40)) }}
        >
          <p className="mb-1 font-mono text-[10px] text-fg-subtle">{categories[hover.c]}</p>
          <p className="flex items-center gap-2">
            <span className="size-2 rounded-[2px]" style={{ background: series[hover.s].color }} />
            <strong className="font-mono text-fg">{yFormat(series[hover.s].values[hover.c] ?? 0)}</strong>
            <span className="text-fg-muted">{series[hover.s].label}</span>
          </p>
        </div>
      )}
    </div>
  );
}
