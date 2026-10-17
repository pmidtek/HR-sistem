"use client";

import { ChevronRight } from "lucide-react";
import type { EmployeeMonthly } from "@/lib/calc/reimburse";
import { formatPeriod, formatRupiah } from "@/lib/format";
import { useApp } from "@/store/app-provider";
import { BarList } from "../dashboard/widgets";
import { useLookups } from "../hooks";
import { Icon } from "../ui/icon";
import { Sheet } from "../ui/sheet";
import { monthSummary } from "./monthly-recap";
import { Block, Tile } from "./recap-bits";

type Props = { month: string; rows: EmployeeMonthly[]; onOpenPerson: (userId: string) => void; onClose: () => void };

/** Rincian satu bulan: infografik siapa yang paling banyak reimburse, lalu daftar nama + total. */
export function MonthDetailSheet({ month, rows, onOpenPerson, onClose }: Props) {
  const { state } = useApp();
  const { userName, teamName } = useLookups();
  const s = monthSummary(rows, month);
  const teamOf = (id: string) => teamName(state.users.find((u) => u.id === id)?.teamId ?? "");

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Reimbursement ${formatPeriod(month)}`}
      header={
        <div>
          <p className="font-display text-base font-medium">{formatPeriod(month)}</p>
          <p className="text-xs text-fg-subtle">Reimbursement recap</p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-3">
          <Tile label="Total reimbursed" value={formatRupiah(s.total)} strong />
          <Tile label="People" value={String(s.people.length)} />
          <Tile label="Claims" value={String(s.claims)} />
        </div>

        <Block title="Top reimbursers">
          <BarList format={formatRupiah} rows={s.people.slice(0, 8).map((p) => ({ label: userName(p.userId), value: p.amount }))} />
        </Block>

        <Block title="Everyone" aside={<span className="text-xs text-fg-subtle">click a name for details</span>}>
          <ol className="flex flex-col divide-y divide-[var(--border-default)] rounded-s shadow-[inset_0_0_0_1px_var(--border-default)]">
            {s.people.map((p, i) => (
              <li key={p.userId}>
                <button type="button" onClick={() => onOpenPerson(p.userId)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover">
                  <span className="w-5 font-mono text-xs text-fg-subtle">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{userName(p.userId)}</span>
                    <span className="block truncate text-xs text-fg-subtle">{teamOf(p.userId)} · {p.count} claim(s)</span>
                  </span>
                  <span className="font-mono text-sm">{formatRupiah(p.amount)}</span>
                  <Icon icon={ChevronRight} size={14} className="text-fg-subtle" />
                </button>
              </li>
            ))}
          </ol>
        </Block>
      </div>
    </Sheet>
  );
}
