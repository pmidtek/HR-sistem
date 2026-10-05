"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { formatNumber } from "@/lib/format";
import type { Payslip } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { updatePayslipManual } from "@/store/actions-payroll";
import { useLookups } from "../hooks";
import { Button, IconButton } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/form";
import { Icon } from "../ui/icon";

type Item = { name: string; amount: number };

function ItemList({ title, items, onChange, placeholder }: { title: string; items: Item[]; onChange: (i: Item[]) => void; placeholder: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-fg-muted">{title}</p>
        <Button variant="ghost" size="small" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => onChange([...items, { name: "", amount: 0 }])}>
          Tambah
        </Button>
      </div>
      {items.length === 0 && <p className="text-xs text-fg-subtle">Tidak ada.</p>}
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_160px_auto] items-end gap-2">
          <Input size="small" placeholder={placeholder} value={it.name} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
          <Input size="small" inputMode="numeric" placeholder="0" value={it.amount ? formatNumber(it.amount) : ""} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))} />
          <IconButton label="Hapus" size="small" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Icon icon={X} size={14} />
          </IconButton>
        </div>
      ))}
    </div>
  );
}

export function ManualDialog({ slip, onClose }: { slip: Payslip; onClose: () => void }) {
  const { actor, run } = useAuthed();
  const { userName } = useLookups();
  const [income, setIncome] = useState<Item[]>(slip.input.otherIncome);
  const [deductions, setDeductions] = useState<Item[]>(slip.input.otherDeductions);

  function save() {
    const clean = (xs: Item[]) => xs.filter((x) => x.name.trim() && x.amount > 0);
    const ok = run((s) => updatePayslipManual(s, slip.id, { otherIncome: clean(income), otherDeductions: clean(deductions) }, actor), "Slip dihitung ulang.");
    if (ok) onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Input manual: ${userName(slip.userId)}`}
      description="Bonus, THR, insentif, kasbon, dll. PPh 21 dihitung ulang otomatis."
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <ItemList title="Pendapatan lain" items={income} onChange={setIncome} placeholder="contoh: Bonus Q3" />
        <ItemList title="Potongan lain" items={deductions} onChange={setDeductions} placeholder="contoh: Kasbon" />
      </div>
    </Dialog>
  );
}
