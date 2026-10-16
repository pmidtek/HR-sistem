"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { riskFlags, type RiskFlag } from "@/lib/calc/reimburse-risk";
import { cn } from "@/lib/cn";
import type { Reimbursement } from "@/lib/types";
import { useApp } from "@/store/app-provider";
import { Icon } from "../ui/icon";

/** Tanda risiko untuk satu pengajuan (dipakai panel detail & badge di tabel). */
export function useRiskFlags(r: Reimbursement): RiskFlag[] {
  const { state, today } = useApp();
  return useMemo(
    () => riskFlags(r, {
      all: state.reimbursements,
      owner: state.users.find((u) => u.id === r.userId),
      categories: state.reimbursementCategories,
      holidays: new Set(state.holidays.map((h) => h.date)),
      today,
    }),
    [r, state.reimbursements, state.users, state.reimbursementCategories, state.holidays, today],
  );
}

const tone = { high: "text-fg-danger", medium: "text-warning", low: "text-fg-muted" } as const;

/** Panel "Checks" untuk peninjau: apa yang perlu dicek sebelum menyetujui atau membayar. */
export function RiskPanel({ claim }: { claim: Reimbursement }) {
  const flags = useRiskFlags(claim);
  if (flags.length === 0) {
    return <p className="flex items-center gap-2 rounded-s bg-sunken px-4 py-3 text-xs text-fg-success"><Icon icon={ShieldCheck} size={14} /> Automatic checks passed: no duplicates, limits, or account issues found.</p>;
  }
  return (
    <div className="rounded-s bg-sunken px-4 py-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-fg"><Icon icon={ShieldAlert} size={14} className="text-warning" /> {flags.length} thing(s) to check before you decide</p>
      <ul className="flex flex-col gap-1.5">
        {flags.map((f, i) => (
          <li key={`${f.code}-${f.itemId ?? i}`} className={cn("flex gap-2 text-xs", tone[f.severity])}>
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
            <span><span className="font-mono text-[10px] tracking-[0.06em] uppercase opacity-80">{f.severity}</span> · {f.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Badge kecil di tabel: jumlah tanda risiko tinggi/sedang. */
export function RiskBadge({ claim }: { claim: Reimbursement }) {
  const flags = useRiskFlags(claim).filter((f) => f.severity !== "low");
  if (flags.length === 0) return null;
  const high = flags.some((f) => f.severity === "high");
  return (
    <span title={flags.map((f) => f.message).join("\n")} className={cn("inline-flex items-center gap-1 rounded-xxs px-1.5 py-0.5 text-[10px]", high ? "bg-danger-subtle text-fg-danger" : "bg-warning-subtle text-warning")}>
      <Icon icon={ShieldAlert} size={11} /> {flags.length} check{flags.length > 1 ? "s" : ""}
    </span>
  );
}
