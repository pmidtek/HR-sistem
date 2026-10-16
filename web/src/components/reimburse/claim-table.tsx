"use client";

import { ChevronRight } from "lucide-react";
import { claimDeclined, claimGross, claimTotal } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { formatDate, formatDayShort, formatRupiah } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { useApp } from "@/store/app-provider";
import { useLookups } from "../hooks";
import { ReimburseBadge } from "../status-badge";
import { EmptyState } from "../ui/display";
import { Icon } from "../ui/icon";
import { Table, Td, Th, Tr } from "../ui/table";
import { PaymentBadge } from "./parts";
import { RiskBadge } from "./risk-panel";
import { usePayDate } from "./use-pay-date";

type Props = {
  list: Reimbursement[];
  onOpen: (id: string) => void;
  showOwner?: boolean;
  /** Jika diisi, baris yang boleh dipilih (mis. siap dibayar) mendapat checkbox. */
  selection?: { selectable: Set<string>; picked: Set<string>; onChange: (next: Set<string>) => void };
  empty?: string;
};

/** Satu baris = satu pengajuan (grup). Klik untuk buka detail. */
export function ClaimTable({ list, onOpen, showOwner, selection, empty = "No claims yet" }: Props) {
  const { userName } = useLookups();
  const { today, state } = useApp();
  const externals = new Set(state.users.filter((u) => u.role === "external").map((u) => u.id));
  const payDate = usePayDate();
  if (list.length === 0) return <EmptyState title={empty} description="Try a different period or filter." />;
  const selectable = selection ? list.filter((r) => selection.selectable.has(r.id)) : [];
  const allPicked = selection !== undefined && selectable.length > 0 && selectable.every((r) => selection.picked.has(r.id));

  function toggle(id: string) {
    if (!selection) return;
    const next = new Set(selection.picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    selection.onChange(next);
  }

  return (
    <Table className="[&_td]:px-3 [&_th]:px-3">
      <thead>
        <tr>
          {selection && (
            <Th className="w-10">
              <input type="checkbox" aria-label="Select all ready to pay" checked={allPicked} disabled={selectable.length === 0} onChange={() => selection.onChange(allPicked ? new Set() : new Set(selectable.map((r) => r.id)))} className="accent-[var(--brand)]" />
            </Th>
          )}
          <Th>No.</Th>
          <Th>Claim</Th>
          {showOwner && <Th>Employee</Th>}
          <Th className="text-right">Total</Th>
          <Th>Approval</Th>
          <Th>Payment</Th>
          <Th className="w-8" />
        </tr>
      </thead>
      <tbody>
        {list.map((r) => {
          const declined = claimDeclined(r);
          const reason = r.status === "rejected" || r.status === "revision" ? [...r.logs].reverse().find((l) => l.to === r.status)?.note : undefined;
          return (
            <Tr key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
              {selection && (
                <Td onClick={(e) => e.stopPropagation()}>
                  {selection.selectable.has(r.id) && (
                    <input type="checkbox" aria-label={`Select ${r.number}`} checked={selection.picked.has(r.id)} onChange={() => toggle(r.id)} className="accent-[var(--brand)]" />
                  )}
                </Td>
              )}
              <Td className="font-mono text-xs whitespace-nowrap text-fg-muted">{r.number}</Td>
              <Td className="min-w-56">
                <p className="flex flex-wrap items-center gap-2 text-sm">{r.title} {showOwner && <RiskBadge claim={r} />}</p>
                <p className="text-xs text-fg-subtle">Submitted {formatDate(r.submittedAt)} · {r.items.length} {r.items.length === 1 ? "item" : "items"}</p>
                {reason && <p className="mt-1 text-xs text-fg-danger">Reason: {reason}</p>}
              </Td>
              {showOwner && (
                <Td className="whitespace-nowrap">
                  <p>{userName(r.userId)}</p>
                  {externals.has(r.userId) && <p className="text-[11px] text-fg-brand">External</p>}
                </Td>
              )}
              <Td className="text-right whitespace-nowrap">
                <p className="font-mono">{formatRupiah(r.status === "rejected" ? claimGross(r) : claimTotal(r))}</p>
                {declined > 0 && r.status !== "rejected" && <p className="text-xs text-fg-danger">−{formatRupiah(declined)} declined</p>}
              </Td>
              <Td><ReimburseBadge status={r.status === "paid" ? "approved" : r.status} /></Td>
              <Td>
                <PaymentBadge r={r} />
                {(r.status === "approved" || r.status === "pending_sponsor" || r.status === "pending_finance" || r.status === "pending_stakeholder") && (
                  <p className={cn("mt-1 text-[11px] whitespace-nowrap", r.status === "approved" && payDate(r.submittedAt) < today ? "text-fg-danger" : "text-fg-subtle")}>
                    {r.status === "approved" && payDate(r.submittedAt) < today ? "Overdue · was due " : "Est. pay "}{formatDayShort(payDate(r.submittedAt))}
                  </p>
                )}
              </Td>
              <Td className="text-fg-subtle"><Icon icon={ChevronRight} size={14} /></Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
