"use client";

import type { PeriodFilter } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { formatDate, formatPeriod } from "@/lib/format";

const kinds: { value: PeriodFilter["kind"]; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "range", label: "Dates" },
];

const field = "h-8 rounded-xxs bg-sunken px-2.5 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border-default)] outline-none focus:shadow-[inset_0_0_0_1px_var(--brand)]";

export function defaultPeriod(today: string): PeriodFilter {
  return { kind: "month", month: today.slice(0, 7) };
}

export function periodLabel(f: PeriodFilter): string {
  switch (f.kind) {
    case "all": return "All time";
    case "year": return String(f.year);
    case "month": return formatPeriod(f.month);
    case "range": return f.from && f.to ? `${formatDate(f.from)} – ${formatDate(f.to)}` : f.from ? `From ${formatDate(f.from)}` : f.to ? `Until ${formatDate(f.to)}` : "All dates";
  }
}

/** Pilih periode: semua, tahun, bulan, atau rentang tanggal. */
export function PeriodFilterControl({ value, onChange, today, years }: { value: PeriodFilter; onChange: (f: PeriodFilter) => void; today: string; years: number[] }) {
  const thisYear = Number(today.slice(0, 4));
  const yearOptions = [...new Set([thisYear, ...years])].sort((a, b) => b - a);

  function switchKind(kind: PeriodFilter["kind"]) {
    if (kind === value.kind) return;
    if (kind === "all") onChange({ kind });
    if (kind === "year") onChange({ kind, year: value.kind === "month" ? Number(value.month.slice(0, 4)) : thisYear });
    if (kind === "month") onChange({ kind, month: value.kind === "year" ? `${value.year}-${today.slice(5, 7)}` : today.slice(0, 7) });
    if (kind === "range") onChange({ kind, from: `${today.slice(0, 7)}-01`, to: today });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Period" className="inline-flex rounded-xs bg-sunken p-0.5 shadow-[inset_0_0_0_1px_var(--border-default)]">
        {kinds.map((k) => (
          <button
            key={k.value}
            type="button"
            role="tab"
            aria-selected={value.kind === k.value}
            onClick={() => switchKind(k.value)}
            className={cn("rounded-xxs px-2.5 py-1 text-xs transition-colors", value.kind === k.value ? "bg-raised text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-fg-muted hover:text-fg")}
          >
            {k.label}
          </button>
        ))}
      </div>
      {value.kind === "year" && (
        <select aria-label="Year" value={value.year} onChange={(e) => onChange({ kind: "year", year: Number(e.target.value) })} className={field}>
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      )}
      {value.kind === "month" && (
        <input aria-label="Month" type="month" value={value.month} max={today.slice(0, 7)} onChange={(e) => e.target.value && onChange({ kind: "month", month: e.target.value })} className={field} />
      )}
      {value.kind === "range" && (
        <>
          <input aria-label="From" type="date" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} className={field} />
          <span className="text-xs text-fg-subtle">to</span>
          <input aria-label="To" type="date" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className={field} />
        </>
      )}
    </div>
  );
}
