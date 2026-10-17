"use client";

import { ChevronRight } from "lucide-react";
import { reimbursed, type EmployeeMonthly, type MonthSelection } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { formatPeriod, formatRupiah } from "@/lib/format";
import { useLookups } from "../hooks";
import { EmptyState } from "../ui/display";
import { Icon } from "../ui/icon";

export const shortMonth = (m: string) => `${formatPeriod(m).slice(0, 3)} ${m.slice(2, 4)}`;

/** Rentang bulan untuk judul, mis. "May 2026 – October 2026". `months` boleh urut naik atau turun. */
export function monthsLabel(months: string[]): string {
  if (months.length === 0) return "-";
  const sorted = [...months].sort();
  if (sorted.length === 1) return formatPeriod(sorted[0]);
  return `${formatPeriod(sorted[0])} – ${formatPeriod(sorted[sorted.length - 1])}`;
}

const field = "h-8 rounded-xxs bg-sunken px-2.5 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border-default)] outline-none focus:shadow-[inset_0_0_0_1px_var(--brand)]";

/** Pilih satu bulan (default bulan ini) atau rentang bulan. */
export function MonthSelectControl({ value, onChange, today }: { value: MonthSelection; onChange: (v: MonthSelection) => void; today: string }) {
  const now = today.slice(0, 7);
  const tabs: { kind: MonthSelection["kind"]; label: string }[] = [{ kind: "month", label: "Month" }, { kind: "range", label: "Range" }];
  const switchKind = (kind: MonthSelection["kind"]) => {
    if (kind === value.kind) return;
    onChange(kind === "month" ? { kind, month: value.kind === "range" ? value.to : now } : { kind, from: value.kind === "month" ? value.month : now, to: value.kind === "month" ? value.month : now });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Months" className="inline-flex rounded-xs bg-sunken p-0.5 shadow-[inset_0_0_0_1px_var(--border-default)]">
        {tabs.map((t) => (
          <button key={t.kind} type="button" role="tab" aria-selected={value.kind === t.kind} onClick={() => switchKind(t.kind)}
            className={cn("rounded-xxs px-2.5 py-1 text-xs transition-colors", value.kind === t.kind ? "bg-raised text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-fg-muted hover:text-fg")}>
            {t.label}
          </button>
        ))}
      </div>
      {value.kind === "month" ? (
        <input aria-label="Month" type="month" value={value.month} max={now} onChange={(e) => e.target.value && onChange({ kind: "month", month: e.target.value })} className={field} />
      ) : (
        <>
          <input aria-label="From month" type="month" value={value.from} max={value.to} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} className={field} />
          <span className="text-xs text-fg-subtle">to</span>
          <input aria-label="To month" type="month" value={value.to} min={value.from} max={now} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} className={field} />
        </>
      )}
    </div>
  );
}

/** Ringkasan satu bulan dari data per pegawai. */
export function monthSummary(rows: EmployeeMonthly[], month: string) {
  const people = rows.filter((e) => e.months.has(month)).map((e) => ({ userId: e.userId, amount: reimbursed(e.months.get(month)!), count: e.months.get(month)!.count }));
  people.sort((a, b) => b.amount - a.amount);
  return { people, total: people.reduce((s, p) => s + p.amount, 0), claims: people.reduce((s, p) => s + p.count, 0) };
}

/** Kartu per bulan (terbaru di depan). Klik untuk buka rincian bulan itu. */
export function MonthCards({ rows, months, onOpen }: { rows: EmployeeMonthly[]; months: string[]; onOpen: (month: string) => void }) {
  const { userName } = useLookups();
  if (months.length === 0) return <EmptyState title="No months selected" />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {months.map((m) => {
        const s = monthSummary(rows, m);
        const top = s.people[0];
        return (
          <button key={m} type="button" onClick={() => onOpen(m)} disabled={s.people.length === 0}
            className="glass flex flex-col gap-3 rounded-s p-4 text-left shadow-[inset_0_0_0_1px_var(--border-default),var(--glass-highlight)] transition-colors enabled:hover:bg-hover disabled:opacity-60">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-medium">{formatPeriod(m)}</span>
              {s.people.length > 0 && <Icon icon={ChevronRight} size={16} className="text-fg-subtle" />}
            </div>
            <span className="font-mono text-xl">{formatRupiah(s.total)}</span>
            <span className="text-xs text-fg-subtle">
              {s.people.length === 0 ? "No claims" : `${s.people.length} people · ${s.claims} claim(s) · top: ${userName(top.userId)}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
