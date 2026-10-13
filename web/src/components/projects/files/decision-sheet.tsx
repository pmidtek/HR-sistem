"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { refLabel } from "@/lib/calc/project";
import type { Decision, DecisionStatus } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deleteDecision, saveDecision, type DecisionInput } from "@/store/actions-files";
import { stamp } from "@/store/project-core";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { Input, Select, Textarea } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { Sheet } from "../../ui/sheet";
import { useProject } from "../workspace/context";

export const decisionStatusLabel: Record<DecisionStatus, string> = {
  proposed: "Diusulkan", accepted: "Diterima", rejected: "Ditolak", superseded: "Digantikan", deprecated: "Usang",
};

export function DecisionSheet({ decision, onClose }: { decision: Decision | null; onClose: () => void }) {
  const { state, actor, today, run } = useAuthed();
  const { project, canEdit } = useProject();
  const [f, setF] = useState<DecisionInput>(decision ?? {
    title: "", context: "", decision: "", consequences: "", category: "", status: "proposed",
    decidedById: null, decidedAt: null, sourceMomId: null, supersedesId: null,
  });
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof DecisionInput>(k: K, v: DecisionInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const others = state.decisions.filter((d) => d.projectId === project.id && d.id !== decision?.id);
  const moms = state.moms.filter((m) => m.projectId === project.id);
  const save = () => run((s) => saveDecision(s, project.id, f, actor, stamp(today)), "Keputusan tersimpan.") && onClose();

  return (
    <>
      <Sheet open onOpenChange={(o) => !o && onClose()} title={f.title || "Keputusan baru"}
        header={<p className="font-display text-lg font-medium">{decision ? `${refLabel("DR", decision.number)} · ${decision.title}` : "Keputusan baru"}</p>}
        footer={canEdit && (
          <>
            {decision && <Button variant="ghost" tone="danger" size="small" iconLeft={<Icon icon={Trash2} size={14} />} onClick={() => setConfirm(true)}>Hapus</Button>}
            <Button className="ml-auto" disabled={!f.title.trim()} onClick={save}>Simpan</Button>
          </>
        )}>
        <fieldset disabled={!canEdit} className="flex flex-col gap-4">
          <Input label="Judul" value={f.title} onChange={(e) => set("title", e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Kategori" value={f.category} placeholder="mis. Arsitektur" onChange={(e) => set("category", e.target.value)} />
            <Select label="Status" value={f.status} onChange={(e) => set("status", e.target.value as DecisionStatus)} options={Object.entries(decisionStatusLabel).map(([value, label]) => ({ value, label }))} />
            <Select label="Diputuskan oleh" value={f.decidedById ?? ""} onChange={(e) => set("decidedById", e.target.value || null)}
              options={[{ value: "", label: "Belum diputuskan" }, ...state.users.filter((u) => project.memberIds.includes(u.id) || u.role === "stakeholder").map((u) => ({ value: u.id, label: u.name }))]} />
            <Input label="Tanggal keputusan" type="date" value={f.decidedAt ?? ""} onChange={(e) => set("decidedAt", e.target.value || null)} />
          </div>
          <Textarea label="Konteks" rows={3} value={f.context} onChange={(e) => set("context", e.target.value)} />
          <Textarea label="Keputusan" rows={3} value={f.decision} onChange={(e) => set("decision", e.target.value)} />
          <Textarea label="Konsekuensi" rows={3} value={f.consequences} onChange={(e) => set("consequences", e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="MOM sumber" value={f.sourceMomId ?? ""} onChange={(e) => set("sourceMomId", e.target.value || null)} options={[{ value: "", label: "Tidak ada" }, ...moms.map((m) => ({ value: m.id, label: m.title }))]} />
            <Select label="Menggantikan keputusan" helperText="Keputusan lama otomatis berstatus Digantikan." value={f.supersedesId ?? ""} onChange={(e) => set("supersedesId", e.target.value || null)}
              options={[{ value: "", label: "Tidak ada" }, ...others.map((d) => ({ value: d.id, label: `${refLabel("DR", d.number)} ${d.title}` }))]} />
          </div>
        </fieldset>
      </Sheet>
      {decision && (
        <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Hapus ${refLabel("DR", decision.number)}?`}
          onConfirm={() => { if (run((s) => deleteDecision(s, decision.id, actor, stamp(today)), "Keputusan dihapus.")) { setConfirm(false); onClose(); } }} />
      )}
    </>
  );
}
