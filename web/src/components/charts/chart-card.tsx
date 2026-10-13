"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card } from "../ui/display";
import { Table, Td, Th, Tr } from "../ui/table";

export type ChartSeries = {
  key: string;
  label: string;
  /** Token warna grafik, mis. "var(--chart-1)". */
  color: string;
  dashed?: boolean;
  values: (number | null)[];
};

/** Lebar container (ResizeObserver) supaya SVG tajam tanpa distorsi teks. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Kunci legenda: garis pendek warna seri (bukan kotak), teks pakai token teks. */
export function LegendKey({ s }: { s: Pick<ChartSeries, "label" | "color" | "dashed"> }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
      <svg width="16" height="4" aria-hidden>
        <line x1="1" y1="2" x2="15" y2="2" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={s.dashed ? "3 3" : undefined} />
      </svg>
      {s.label}
    </span>
  );
}

type Props = {
  title: string;
  subtitle?: string;
  series: Pick<ChartSeries, "key" | "label" | "color" | "dashed">[];
  /** Data untuk tampilan tabel (aksesibilitas). Baris pertama = header. */
  table: { head: string[]; rows: (string | number)[][] };
  aside?: ReactNode;
  children: ReactNode;
};

/** Bingkai grafik: judul, legenda (≥ 2 seri), toggle tampilan tabel. */
export function ChartCard({ title, subtitle, series, table, aside, children }: Props) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card padding="md" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-medium">{title}</h3>
          {subtitle && <p className="text-xs text-fg-subtle">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {aside}
          <button type="button" onClick={() => setAsTable((x) => !x)} className="text-xs text-fg-brand hover:underline" aria-pressed={asTable}>
            {asTable ? "Lihat grafik" : "Lihat tabel"}
          </button>
        </div>
      </div>
      {series.length >= 2 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">{series.map((s) => <LegendKey key={s.key} s={s} />)}</div>
      )}
      {asTable ? (
        <div className="max-h-72 overflow-y-auto">
          <Table>
            <thead><tr>{table.head.map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {table.rows.map((r, i) => (
                <Tr key={i}>{r.map((c, j) => <Td key={j} className={j > 0 ? "font-mono text-xs" : "text-xs"}>{c}</Td>)}</Tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : children}
    </Card>
  );
}
