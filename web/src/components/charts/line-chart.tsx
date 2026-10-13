"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/calc/chart-scale";
import { useWidth, type ChartSeries } from "./chart-card";

type Props = {
  /** Label sumbu X per titik (mis. "05 Okt"). */
  x: string[];
  series: ChartSeries[];
  height?: number;
  yFormat?: (v: number) => string;
  yMax?: number;
  /** Indeks titik yang diberi garis "hari ini". */
  todayIndex?: number;
};

const PAD = { top: 12, right: 64, bottom: 26, left: 36 };

/** Grafik garis: garis 2px, titik akhir ≥ 8px dengan cincin, crosshair + tooltip semua seri. */
export function LineChart({ x, series, height = 220, yFormat = (v) => String(v), yMax, todayIndex }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = yMax ?? Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const px = (i: number) => PAD.left + (x.length <= 1 ? w / 2 : (i * w) / (x.length - 1));
  const py = (v: number) => PAD.top + h - (v / top) * h;
  const labelEvery = Math.max(1, Math.ceil(x.length / Math.max(2, Math.floor(w / 64))));

  const pathOf = (vals: (number | null)[]) =>
    vals.reduce<string>((d, v, i) => (v === null ? d : `${d}${d === "" || vals[i - 1] === null ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`), "");
  const lastIndex = (vals: (number | null)[]) => vals.reduce<number>((li, v, i) => (v === null ? li : i), -1);

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / Math.max(1, rect.width);
    setHover(Math.max(0, Math.min(x.length - 1, Math.round(rel * (x.length - 1)))));
  }

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
          {x.map((label, i) => (i % labelEvery === 0 ? (
            <text key={i} x={px(i)} y={height - 8} textAnchor="middle" className="fill-[var(--text-tertiary)] font-mono text-[10px]">{label}</text>
          ) : null))}
          {todayIndex !== undefined && todayIndex >= 0 && todayIndex < x.length && (
            <line x1={px(todayIndex)} x2={px(todayIndex)} y1={PAD.top} y2={PAD.top + h} stroke="var(--border-strong)" strokeWidth="1" />
          )}
          {series.map((s) => {
            const li = lastIndex(s.values);
            const lv = li >= 0 ? s.values[li] : null;
            return (
              <g key={s.key}>
                <path d={pathOf(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "5 4" : undefined} />
                {lv !== null && li >= 0 && (
                  <>
                    <circle cx={px(li)} cy={py(lv)} r="4" fill={s.color} stroke="var(--surface-overlay)" strokeWidth="2" />
                    <text x={px(li) + 8} y={py(lv)} dy="0.32em" className="fill-[var(--text-secondary)] text-[11px]">{yFormat(lv)}</text>
                  </>
                )}
              </g>
            );
          })}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={px(hover)} x2={px(hover)} y1={PAD.top} y2={PAD.top + h} stroke="var(--text-tertiary)" strokeWidth="1" />
              {series.map((s) => { const v = s.values[hover]; return v === null ? null : <circle key={s.key} cx={px(hover)} cy={py(v)} r="4" fill={s.color} stroke="var(--surface-overlay)" strokeWidth="2" />; })}
            </g>
          )}
          <rect x={PAD.left} y={PAD.top} width={w} height={h} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-xs bg-overlay px-3 py-2 text-xs shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-md)] backdrop-blur-xl"
          style={px(hover) > width / 2 ? { right: width - px(hover) + 10 } : { left: px(hover) + 10 }}
        >
          <p className="mb-1 font-mono text-[10px] text-fg-subtle">{x[hover]}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-2">
              <svg width="12" height="4" aria-hidden><line x1="1" y1="2" x2="11" y2="2" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "3 2" : undefined} /></svg>
              <strong className="font-mono text-fg">{s.values[hover] === null ? "–" : yFormat(s.values[hover] ?? 0)}</strong>
              <span className="text-fg-muted">{s.label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
