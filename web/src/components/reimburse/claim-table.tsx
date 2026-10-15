"use client";

import { ChevronRight } from "lucide-react";
import { claimDeclined, claimGross, claimTotal } from "@/lib/calc/reimburse";
import { formatDate, formatRupiah } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { useLookups } from "../hooks";
import { ReimburseBadge } from "../status-badge";
import { EmptyState } from "../ui/display";
import { Icon } from "../ui/icon";
import { Table, Td, Th, Tr } from "../ui/table";
import { PaymentBadge } from "./parts";

type Props = {
  list: Reimbursement[];
  onOpen: (id: string) => void;
  showOwner?: boolean;
  /** Jika diisi, baris yang boleh dipilih (mis. siap dibayar) mendapat checkbox. */
  selection?: { selectable: Set<string>; picked: Set<string>; onChange: (next: Set<string>) => void };
  empty?: string;
};

/** Satu baris = satu pengajuan (grup). Klik untuk buka detail. */
export function ClaimTable({ list, onOpen, showOwner, selection, empty = "Belum ada reimburse" }: Props) {
  const { userName } = useLookups();
  if (list.length === 0) return <EmptyState title={empty} description="Coba ubah filter." />;
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
              <input type="checkbox" aria-label="Pilih semua yang siap dibayar" checked={allPicked} disabled={selectable.length === 0} onChange={() => selection.onChange(allPicked ? new Set() : new Set(selectable.map((r) => r.id)))} className="accent-[var(--brand)]" />
            </Th>
          )}
          <Th>No.</Th>
          <Th>Pengajuan</Th>
          {showOwner && <Th>Pegawai</Th>}
          <Th className="text-right">Total</Th>
          <Th>Persetujuan</Th>
          <Th>Pembayaran</Th>
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
                    <input type="checkbox" aria-label={`Pilih ${r.number}`} checked={selection.picked.has(r.id)} onChange={() => toggle(r.id)} className="accent-[var(--brand)]" />
                  )}
                </Td>
              )}
              <Td className="font-mono text-xs whitespace-nowrap text-fg-muted">{r.number}</Td>
              <Td className="min-w-56">
                <p className="text-sm">{r.title}</p>
                <p className="text-xs text-fg-subtle">Diajukan {formatDate(r.submittedAt)} · {r.items.length} baris</p>
                {reason && <p className="mt-1 text-xs text-fg-danger">Alasan: {reason}</p>}
              </Td>
              {showOwner && <Td className="whitespace-nowrap">{userName(r.userId)}</Td>}
              <Td className="text-right whitespace-nowrap">
                <p className="font-mono">{formatRupiah(r.status === "rejected" ? claimGross(r) : claimTotal(r))}</p>
                {declined > 0 && r.status !== "rejected" && <p className="text-xs text-fg-danger">−{formatRupiah(declined)} ditolak</p>}
              </Td>
              <Td><ReimburseBadge status={r.status === "paid" ? "approved" : r.status} /></Td>
              <Td><PaymentBadge r={r} /></Td>
              <Td className="text-fg-subtle"><Icon icon={ChevronRight} size={14} /></Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
