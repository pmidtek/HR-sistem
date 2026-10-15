"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "../ui/display";
import { CountUp, GrowBar, StaggerItem } from "../ui/motion";

/** Satu seri, horizontal: magnitudo per kategori. Teks memakai token teks; warna hanya di bar. */
export function BarList({ rows, format }: { rows: { label: string; value: number; hint?: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-xs text-fg-muted">No data yet.</p>;
  return (
    <div className="flex flex-col gap-2.5" role="table">
      {rows.map((r) => (
        <div key={r.label} role="row" title={`${r.label}: ${format(r.value)}`} className="group grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3">
          <span role="cell" className="truncate text-xs text-fg-muted">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-[4px] bg-hover">
            <GrowBar ratio={r.value / max} className="h-full w-full rounded-[4px] bg-brand transition-opacity group-hover:opacity-80" />
          </span>
          <span role="cell" className="text-right font-mono text-xs text-fg">{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Panel dashboard. Otomatis ikut stagger jika berada di dalam <Stagger>. */
export function Panel({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <StaggerItem className="flex">
      <Card padding="lg" className={cn("flex w-full flex-col gap-4", className)}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-medium">{title}</h3>
          {aside}
        </div>
        {children}
      </Card>
    </StaggerItem>
  );
}

export function ActionTile({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <StaggerItem>
      <Link href={href}>
        <Card interactive tone={count > 0 ? "brand" : "raised"} className="flex flex-col gap-1">
          <span className="text-xs text-fg-muted">{label}</span>
          <CountUp value={count} className="font-serif text-4xl leading-none" />
          <span className="text-xs text-fg-subtle">{count > 0 ? "waiting for you" : "all clear"}</span>
        </Card>
      </Link>
    </StaggerItem>
  );
}

export function MiniList({ items, empty }: { items: { key: string; left: ReactNode; right?: ReactNode }[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-fg-muted">{empty}</p>;
  return (
    <ul className="flex flex-col divide-y divide-[var(--border-default)]">
      {items.map((i) => (
        <li key={i.key} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0 truncate">{i.left}</span>
          {i.right && <span className="shrink-0 text-xs text-fg-muted">{i.right}</span>}
        </li>
      ))}
    </ul>
  );
}
