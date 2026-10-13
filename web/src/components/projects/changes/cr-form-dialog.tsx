"use client";

import { useState } from "react";
import type { ChangeRequest, ChangeSource } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { saveCr, type CrInput } from "@/store/actions-changes";
import { stamp } from "@/store/project-core";
import { Button } from "../../ui/button";
import { Dialog } from "../../ui/dialog";
import { Input, Select, Textarea } from "../../ui/form";
import { useProject } from "../workspace/context";

export const sourceLabel: Record<ChangeSource, string> = { client: "Klien", internal: "Internal" };

/** Form CR baru / edit (selama belum diputuskan). */
export function CrFormDialog({ cr, onClose }: { cr: ChangeRequest | null; onClose: () => void }) {
  const { user, actor, today, run } = useAuthed();
  const { project } = useProject();
  const [f, setF] = useState<CrInput>(cr ?? { title: "", description: "", source: "client", requestedBy: user.name, requestedAt: today, impactDays: 0, impactNote: "", estimateHours: null });
  const set = <K extends keyof CrInput>(k: K, v: CrInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.title.trim() && f.description.trim() && f.requestedBy.trim();
  const save = () => run((s) => saveCr(s, project.id, f, actor, stamp(today)), cr ? "CR diperbarui." : "CR diajukan. Lead project mendapat notifikasi.") && onClose();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={cr ? "Edit change request" : "Change request baru"} width="lg"
      footer={<><Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button><Button disabled={!valid} onClick={save}>{cr ? "Simpan" : "Ajukan"}</Button></>}>
      <div className="flex flex-col gap-4">
        <Input label="Judul *" value={f.title} autoFocus onChange={(e) => set("title", e.target.value)} />
        <Textarea label="Deskripsi *" rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Sumber" value={f.source} onChange={(e) => set("source", e.target.value as ChangeSource)} options={Object.entries(sourceLabel).map(([value, label]) => ({ value, label }))} />
          <Input label="Diminta oleh *" value={f.requestedBy} onChange={(e) => set("requestedBy", e.target.value)} />
          <Input label="Tanggal permintaan" type="date" value={f.requestedAt} onChange={(e) => set("requestedAt", e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Dampak ke timeline (hari)" type="number" min={0} value={f.impactDays} onChange={(e) => set("impactDays", Math.max(0, Number(e.target.value) || 0))} />
          <Input label="Estimasi jam" type="number" min={0} value={f.estimateHours ?? ""} onChange={(e) => set("estimateHours", e.target.value === "" ? null : Number(e.target.value))} />
        </div>
        <Textarea label="Catatan dampak" rows={2} value={f.impactNote} onChange={(e) => set("impactNote", e.target.value)} />
      </div>
    </Dialog>
  );
}
