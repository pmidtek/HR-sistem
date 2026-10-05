"use client";

import { useState } from "react";
import { STAGES } from "@/lib/mock/sales";
import { formatNumber } from "@/lib/format";
import type { Opportunity, OpportunityStage } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { saveOpportunity } from "@/store/actions-business";
import { useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox";
import { Dialog } from "../ui/dialog";
import { Input, Select, Textarea } from "../ui/form";

type Draft = Omit<Opportunity, "id" | "code"> & { id?: string; code?: string };

export function OpportunityDialog({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const { state, today, run } = useAuthed();
  const { userOptions } = useLookups();
  const [f, setF] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((x) => ({ ...x, [k]: v }));
  const salesUsers = new Set(state.users.filter((u) => state.teams.find((t) => t.id === u.teamId)?.kind === "sales").map((u) => u.id));

  function save() {
    if (!f.name.trim() || !f.companyId || !f.ownerId) return;
    if (run((s) => saveOpportunity(s, f, today), f.id ? "Opportunity diperbarui." : "Opportunity dibuat.")) onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={f.id ? `Edit ${f.code}` : "Opportunity baru"}
      description={f.id ? undefined : "Kode OPYYXXXX dibuat otomatis."}
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={!f.name.trim() || !f.companyId || !f.ownerId}>Simpan</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Nama opportunity" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <Combobox label="Company" value={f.companyId} onChange={(v) => set("companyId", v)} options={state.companies.map((c) => ({ value: c.id, label: c.name, hint: c.industry }))} placeholder="Pilih company" />
        <Combobox label="PIC Sales" value={f.ownerId} onChange={(v) => set("ownerId", v)} options={userOptions.filter((o) => salesUsers.has(o.value))} placeholder="Pilih PIC" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nilai estimasi (Rp)" inputMode="numeric" value={f.value ? formatNumber(f.value) : ""} onChange={(e) => set("value", Number(e.target.value.replace(/\D/g, "")) || 0)} />
          <Input label="Perkiraan closing" type="date" value={f.expectedClose} onChange={(e) => set("expectedClose", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tahap"
            value={f.stage}
            onChange={(e) => {
              const stage = e.target.value as OpportunityStage;
              setF((x) => ({ ...x, stage, probability: STAGES.find((st) => st.id === stage)?.probability ?? x.probability }));
            }}
            options={STAGES.map((st) => ({ value: st.id, label: st.name }))}
          />
          <Input label="Probabilitas (%)" type="number" min={0} max={100} value={f.probability} onChange={(e) => set("probability", Number(e.target.value))} />
        </div>
        {f.stage === "lost" && <Textarea label="Alasan kalah (wajib)" value={f.lostReason ?? ""} onChange={(e) => set("lostReason", e.target.value)} />}
      </div>
    </Dialog>
  );
}
