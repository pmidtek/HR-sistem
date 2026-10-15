"use client";

import { useState } from "react";
import { claimTotal } from "@/lib/calc/reimburse";
import { formatRupiah } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { payReimburseClaims } from "@/store/actions-reimburse";
import { useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input, Select } from "../ui/form";

/** Finance membayar satu atau beberapa pengajuan sekaligus. */
export function PayDialog({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone?: () => void }) {
  const { state, actor, today, run } = useAuthed();
  const { userName } = useLookups();
  const claims = state.reimbursements.filter((r) => ids.includes(r.id));
  const total = claims.reduce((s, r) => s + claimTotal(r), 0);
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<"transfer" | "payroll">(state.settings.payroll.reimburseViaPayroll ? "payroll" : "transfer");
  const [reference, setReference] = useState("");

  function pay() {
    const ok = run((s) => payReimburseClaims(s, ids, { date, method, reference: reference.trim() }, actor), `${claims.length} pengajuan ditandai sudah dibayar.`);
    if (ok) {
      onDone?.();
      onClose();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Bayar ${claims.length} pengajuan`}
      description="Setiap pengajuan dibayar penuh (baris yang ditolak tidak ikut)."
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button>
          <Button onClick={pay}>Tandai dibayar {formatRupiah(total)}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ul className="flex max-h-48 flex-col divide-y divide-[var(--border-default)] overflow-y-auto rounded-s bg-sunken px-3">
          {claims.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate"><span className="font-mono text-xs text-fg-subtle">{r.number}</span> {userName(r.userId)}</span>
              <span className="font-mono">{formatRupiah(claimTotal(r))}</span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tanggal bayar" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Metode" value={method} onChange={(e) => setMethod(e.target.value === "payroll" ? "payroll" : "transfer")} options={[{ value: "transfer", label: "Transfer bank" }, { value: "payroll", label: "Lewat payroll" }]} />
        </div>
        <Input label="No. referensi (opsional)" placeholder="Mis. nomor transfer" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
    </Dialog>
  );
}
