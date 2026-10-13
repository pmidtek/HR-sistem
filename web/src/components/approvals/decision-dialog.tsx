"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input, Textarea } from "../ui/form";
import { SuccessCheck } from "../ui/success-check";

/** Lama centang sukses tampil sebelum dialog tertutup. */
const SUCCESS_HOLD_MS = 520;

export type Decision = {
  title: string;
  confirmLabel: string;
  tone: "brand" | "danger";
  noteRequired: boolean;
  /** Untuk lembur: jam yang diajukan (menit) agar reviewer bisa mengubahnya. */
  requestedMinutes?: number;
  onConfirm: (note: string, approvedMinutes?: number) => boolean;
};

export function DecisionDialog({ decision, onClose }: { decision: Decision; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(decision.requestedMinutes !== undefined ? String(decision.requestedMinutes / 60) : "");
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(onClose, SUCCESS_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [done, onClose]);

  function confirm() {
    const minutes = decision.requestedMinutes !== undefined ? Math.round(Number(hours.replace(",", ".")) * 4) * 15 : undefined;
    if (minutes !== undefined && (Number.isNaN(minutes) || minutes <= 0)) return setError("Jam tidak valid.");
    const changed = minutes !== undefined && minutes !== decision.requestedMinutes;
    if ((decision.noteRequired || changed) && !note.trim()) {
      return setError(changed ? "Perubahan jumlah jam wajib disertai catatan." : "Catatan wajib diisi.");
    }
    if (!decision.onConfirm(note.trim(), changed ? minutes : undefined)) return;
    // Keputusan positif (setujui/teruskan/bayar): tampilkan centang dulu, lalu tutup.
    if (decision.tone === "brand") setDone(true);
    else onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={decision.title}
      footer={
        !done && (
          <>
            <Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button>
            <Button tone={decision.tone} onClick={confirm}>{decision.confirmLabel}</Button>
          </>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6" role="status">
          <SuccessCheck size={56} />
          <p className="text-sm text-fg">Tersimpan</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {decision.requestedMinutes !== undefined && (
            <Input
              label="Jam lembur yang disetujui"
              helperText="Kelipatan 0,25 jam. Ubah jika berbeda dari pengajuan (wajib isi catatan)."
              inputMode="decimal"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          )}
          <Textarea
            label={decision.noteRequired ? "Catatan (wajib)" : "Catatan (opsional)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={error}
          />
        </div>
      )}
    </Dialog>
  );
}
