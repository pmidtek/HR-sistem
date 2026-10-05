"use client";

import { useState } from "react";
import { countWorkingDays, hasSufficientBalance } from "@/lib/calc/leave";
import { useAuthed } from "@/store/app-provider";
import { submitLeave } from "@/store/actions";
import { useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input, Select, Textarea } from "../ui/form";

export function LeaveForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, user, today, run } = useAuthed();
  const { holidaySet } = useLookups();
  const [typeId, setTypeId] = useState("annual");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const type = state.leaveTypes.find((t) => t.id === typeId);
  const days = countWorkingDays(start, end, holidaySet, state.settings.work.workdaysPerWeek);
  const balance = state.leaveBalances.find((b) => b.userId === user.id && b.leaveTypeId === typeId);
  const remaining = balance ? balance.quota - balance.used : null;
  const needsAttachment = type?.attachmentAfterDays != null && days > type.attachmentAfterDays;

  function submit() {
    if (end < start) return setError("Tanggal selesai harus setelah tanggal mulai.");
    if (days === 0) return setError("Rentang tanggal tidak berisi hari kerja.");
    if (type?.deductsBalance && balance && !hasSufficientBalance(balance.quota, balance.used, days)) {
      return setError(`Saldo tidak cukup. Sisa ${remaining} hari.`);
    }
    if (needsAttachment && !attachment) return setError("Wajib melampirkan surat dokter untuk sakit lebih dari 1 hari.");
    if (!reason.trim()) return setError("Alasan wajib diisi.");
    const ok = run(
      (s) => submitLeave(s, { userId: user.id, leaveTypeId: typeId, startDate: start, endDate: end, workingDays: days, reason }),
      "Pengajuan cuti terkirim ke HR.",
    );
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ajukan cuti"
      description="Alur: HR review, lalu keputusan Stakeholder."
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit}>Ajukan</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="Jenis cuti" value={typeId} onChange={(e) => setTypeId(e.target.value)} options={state.leaveTypes.map((t) => ({ value: t.id, label: t.name }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mulai" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="Selesai" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-xs bg-sunken px-3 py-2.5 text-sm">
          <span className="text-fg-muted">Hari kerja dihitung</span>
          <span className="font-mono">
            {days} hari{type?.deductsBalance && remaining !== null && <span className="text-fg-subtle"> · sisa saldo {remaining - days}</span>}
          </span>
        </div>
        {type?.unpaid && <p className="text-xs text-warning">Cuti tanpa gaji akan memotong gaji pada payroll periode terkait.</p>}
        {needsAttachment && (
          <Input label="Lampiran surat dokter" type="file" accept="image/*,application/pdf" onChange={(e) => setAttachment(e.target.files?.[0]?.name ?? null)} />
        )}
        <Textarea label="Alasan" value={reason} onChange={(e) => setReason(e.target.value)} error={error} />
      </div>
    </Dialog>
  );
}
