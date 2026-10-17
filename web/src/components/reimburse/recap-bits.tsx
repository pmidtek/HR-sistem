import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";

export function MonthChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-xxs px-2.5 py-1 text-xs shadow-[inset_0_0_0_1px_var(--border-default)]", active ? "bg-brand text-fg-on-brand shadow-none" : "text-fg-muted hover:bg-hover")}>
      {children}
    </button>
  );
}

export function Tile({ label, value, sub, tone, strong }: { label: string; value: string; sub?: string; tone?: "success" | "warning" | "danger"; strong?: boolean }) {
  const color = tone === "success" ? "text-fg-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-fg-danger" : "text-fg";
  return (
    <div className={cn("flex flex-col gap-1 rounded-xs px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--border-default)]", strong && "bg-sunken")}>
      <span className="text-xs text-fg-muted">{label}</span>
      <span className={cn("font-mono text-sm", color)}>{value}</span>
      {sub && <span className="text-[11px] text-fg-subtle">{sub}</span>}
    </div>
  );
}

export function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-medium">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Daftar nominal + jumlah baris + porsi dari total. */
export function Breakdown({ rows, total }: { rows: { key: string; label: ReactNode; amount: number; count: number }[]; total: number }) {
  if (rows.length === 0) return <p className="text-xs text-fg-subtle">Nothing reimbursed.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
        return (
          <li key={r.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{r.label} <span className="text-xs text-fg-subtle">· {r.count} row(s)</span></span>
              <span className="shrink-0 font-mono text-xs">{formatRupiah(r.amount)} <span className="text-fg-subtle">({pct}%)</span></span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
          </li>
        );
      })}
    </ul>
  );
}
