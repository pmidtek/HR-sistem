"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Deliverable, DeliverablePhase } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deleteDeliverable, deliverableStatusLabel, saveDeliverable, type DeliverableInput } from "@/store/actions-plan";
import { stamp } from "@/store/project-core";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { Input, Select, Textarea } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { Sheet } from "../../ui/sheet";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

export const phaseLabel: Record<DeliverablePhase, string> = {
  proposal: "Proposal",
  requirement: "Requirement",
  design: "Desain",
  build: "Build",
  testing: "Testing",
  final: "Delivery Final",
};

/** Detail / form deliverable. `deliverable` null = baru. Read-only jika tidak bisa kelola. */
export function DeliverableSheet({ deliverable, data, onClose }: { deliverable: Deliverable | null; data: ProjectData; onClose: () => void }) {
  const { user, actor, today, run } = useAuthed();
  const { project, canManage } = useProject();
  const [f, setF] = useState<DeliverableInput>(
    deliverable ?? { title: "", description: "", phase: "build", status: "draft", deadline: null, link: null, ownerId: project.leadId || user.id },
  );
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof DeliverableInput>(k: K, v: DeliverableInput[K]) => setF((x) => ({ ...x, [k]: v }));

  function save() {
    if (run((s) => saveDeliverable(s, project.id, f, actor, stamp(today)), deliverable ? "Deliverable diperbarui." : "Deliverable dibuat.")) onClose();
  }

  return (
    <>
      <Sheet
        open onOpenChange={(o) => !o && onClose()} title={deliverable?.title ?? "Deliverable baru"}
        header={<p className="font-display text-lg font-medium">{deliverable ? "Detail deliverable" : "Deliverable baru"}</p>}
        footer={canManage && (
          <>
            {deliverable && <Button variant="ghost" tone="danger" size="small" iconLeft={<Icon icon={Trash2} size={14} />} onClick={() => setConfirm(true)}>Hapus</Button>}
            <Button className="ml-auto" disabled={!f.title.trim()} onClick={save}>Simpan</Button>
          </>
        )}
      >
        <fieldset disabled={!canManage} className="flex flex-col gap-4">
          <Input label="Judul" value={f.title} onChange={(e) => set("title", e.target.value)} />
          <Textarea label="Deskripsi" value={f.description} onChange={(e) => set("description", e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Fase" value={f.phase} onChange={(e) => set("phase", e.target.value as DeliverablePhase)} options={Object.entries(phaseLabel).map(([value, label]) => ({ value, label }))} />
            <Select label="Status" value={f.status} onChange={(e) => set("status", e.target.value as DeliverableInput["status"])} options={Object.entries(deliverableStatusLabel).map(([value, label]) => ({ value, label }))} />
            <Select label="PIC" value={f.ownerId} onChange={(e) => set("ownerId", e.target.value)} options={data.memberOptions.map((m) => ({ value: m.value, label: m.label }))} />
            <Input label="Deadline" type="date" value={f.deadline ?? ""} onChange={(e) => set("deadline", e.target.value || null)} />
          </div>
          <Input label="Link dokumen" placeholder="https://…" value={f.link ?? ""} onChange={(e) => set("link", e.target.value.trim() || null)} />
          {f.link && (
            <a href={f.link} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm text-fg-brand hover:underline">
              Buka dokumen <Icon icon={ExternalLink} size={14} />
            </a>
          )}
        </fieldset>
      </Sheet>
      {deliverable && (
        <ConfirmDialog
          open={confirm} onOpenChange={setConfirm} title={`Hapus "${deliverable.title}"?`}
          onConfirm={() => { if (run((s) => deleteDeliverable(s, deliverable.id, actor, stamp(today)), "Deliverable dihapus.")) { setConfirm(false); onClose(); } }}
        />
      )}
    </>
  );
}
