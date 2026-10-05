"use client";

import { Paperclip, X } from "lucide-react";
import { useState } from "react";
import { formatNumber } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { submitReimburse } from "@/store/actions";
import { useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox";
import { Dialog } from "../ui/dialog";
import { Input, Select, Textarea } from "../ui/form";
import { Icon } from "../ui/icon";

export function ReimburseForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, user, today, run } = useAuthed();
  const { projectOptions } = useLookups();
  const [date, setDate] = useState(today);
  const [categoryId, setCategoryId] = useState("");
  const [projectCode, setProjectCode] = useState("INTERNAL");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  function submit() {
    const errs: string[] = [];
    if (!date || date > today) errs.push("Tanggal transaksi tidak valid.");
    if (!categoryId) errs.push("Kategori wajib dipilih.");
    if (!projectCode) errs.push("Kode project wajib dipilih.");
    if (amount <= 0) errs.push("Total harus lebih dari 0.");
    if (!description.trim()) errs.push("Keterangan wajib diisi.");
    if (files.length === 0) errs.push("Minimal 1 foto/bukti.");
    setErrors(errs);
    if (errs.length > 0) return;
    const ok = run(
      (s) => submitReimburse(s, { userId: user.id, date, categoryId, projectCode, amount, description, files }),
      "Reimburse terkirim ke Finance.",
    );
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ajukan reimburse"
      description="Alur: Finance review, lalu keputusan Stakeholder, lalu dibayar."
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit}>Ajukan</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tanggal transaksi" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Kategori" value={categoryId} placeholder="Pilih kategori" onChange={(e) => setCategoryId(e.target.value)} options={state.reimbursementCategories.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        <Combobox label="Kode Project" value={projectCode} onChange={setProjectCode} options={projectOptions} />
        <Input
          label="Total (Rupiah)"
          inputMode="numeric"
          value={amount === 0 ? "" : formatNumber(amount)}
          placeholder="0"
          iconLeft={<span className="text-xs">Rp</span>}
          onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
        />
        <Textarea label="Keterangan" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex flex-col gap-2">
          <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border border-dashed border-line-strong text-xs text-fg-muted hover:bg-hover">
            <Icon icon={Paperclip} />
            Upload foto atau PDF (bisa lebih dari 1)
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? []).map((x) => x.name)])}
            />
          </label>
          {files.map((f, i) => (
            <div key={`${f}-${i}`} className="flex items-center justify-between rounded-xs bg-sunken px-3 py-1.5 text-xs">
              <span className="truncate">{f}</span>
              <button type="button" aria-label={`Hapus ${f}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="text-fg-subtle hover:text-fg">
                <Icon icon={X} size={14} />
              </button>
            </div>
          ))}
        </div>
        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-xs bg-danger-subtle px-3 py-2 text-xs text-fg-danger">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
