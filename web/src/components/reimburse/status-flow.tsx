"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { claimGross, stageTotals, type Stage } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { Card } from "../ui/display";
import { Icon } from "../ui/icon";
import { CountUp } from "../ui/motion";
import { stageMeta } from "./parts";

const flow: Stage[] = ["finance", "stakeholder", "unpaid", "paid"];
const side: Stage[] = ["revision", "rejected"];
const barOrder: Stage[] = ["paid", "unpaid", "stakeholder", "finance", "revision", "rejected"];

type Props = {
  list: Reimbursement[];
  /** Tahap yang sedang difilter; klik tahap untuk filter, klik lagi untuk batal. */
  selected?: Stage | null;
  onSelect?: (s: Stage | null) => void;
  title?: string;
};

/** Infografik alur reimburse: nominal per tahap, dari review sampai dibayar. */
export function StatusFlow({ list, selected = null, onSelect, title = "Payment status" }: Props) {
  const t = stageTotals(list);
  const gross = list.reduce((s, r) => s + claimGross(r), 0);
  const barTotal = barOrder.reduce((s, k) => s + t[k].amount, 0);
  const approved = t.unpaid.amount + t.paid.amount;
  const paidPct = approved > 0 ? Math.round((t.paid.amount / approved) * 100) : 0;
  const pick = (s: Stage) => onSelect?.(selected === s ? null : s);

  return (
    <Card padding="lg" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs text-fg-muted">{title}</p>
          <CountUp value={gross} format={formatRupiah} className="font-serif text-4xl leading-tight" />
          <p className="text-xs text-fg-subtle">{list.length} {list.length === 1 ? "claim" : "claims"} · {list.reduce((s, r) => s + r.items.length, 0)} items</p>
        </div>
        <div className="flex items-center gap-3">
          <Ring pct={paidPct} />
          <div>
            <p className="text-sm">{paidPct}% paid</p>
            <p className="text-xs text-fg-subtle">of {formatRupiah(approved)} approved</p>
          </div>
        </div>
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken" role="img" aria-label="Amount by stage">
        {barOrder.map((k) => t[k].amount > 0 && (
          <motion.span
            key={k}
            title={`${stageMeta[k].label}: ${formatRupiah(t[k].amount)}`}
            className="h-full border-r-2 border-[var(--surface-solid)] last:border-r-0"
            style={{ background: stageMeta[k].color }}
            initial={{ width: 0 }}
            animate={{ width: `${(t[k].amount / barTotal) * 100}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        {flow.map((k, i) => (
          <div key={k} className="flex items-center gap-2">
            <StepButton stage={k} step={i + 1} count={t[k].count} amount={t[k].amount} active={selected === k} onClick={onSelect && (() => pick(k))} />
            {i < flow.length - 1 && <Icon icon={ChevronRight} size={16} className="hidden text-fg-subtle md:block" />}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {side.map((k) => (
          <button
            key={k}
            type="button"
            disabled={!onSelect}
            onClick={() => pick(k)}
            className={cn(
              "inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs shadow-[inset_0_0_0_1px_var(--border-default)] enabled:hover:bg-hover",
              selected === k && "bg-hover shadow-[inset_0_0_0_1px_var(--border-strong)]",
            )}
          >
            <span className="size-2 rounded-full" style={{ background: stageMeta[k].color }} />
            {stageMeta[k].label}
            <span className="font-mono text-fg-muted">{t[k].count} · {formatRupiah(t[k].amount)}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function StepButton({ stage, step, count, amount, active, onClick }: { stage: Stage; step: number; count: number; amount: number; active: boolean; onClick?: () => void }) {
  const m = stageMeta[stage];
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2 rounded-s p-3 text-left shadow-[inset_0_0_0_1px_var(--border-default)] transition-colors enabled:hover:bg-hover",
        active && "bg-hover shadow-[inset_0_0_0_1.5px_var(--border-strong)]",
      )}
    >
      <span className="flex items-center gap-2 text-xs text-fg-muted">
        <span className="flex size-5 items-center justify-center rounded-full font-mono text-[10px] text-[#141210]" style={{ background: m.color }}>{step}</span>
        {m.short}
      </span>
      <span className="font-mono text-base text-fg">{formatRupiah(amount)}</span>
      <span className="text-xs text-fg-subtle">{count} {count === 1 ? "claim" : "claims"}</span>
    </button>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--surface-hover)" strokeWidth="5" />
      <motion.circle
        cx="22" cy="22" r={r} fill="none" stroke="var(--success)" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} transform="rotate(-90 22 22)"
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - pct / 100) }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
