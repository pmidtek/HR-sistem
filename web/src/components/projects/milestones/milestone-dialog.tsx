"use client";

import { useState } from "react";
import { taskRef } from "@/lib/calc/project";
import type { Milestone } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { saveMilestone, type MilestoneInput } from "@/store/actions-plan";
import { stamp } from "@/store/project-core";
import { Button } from "../../ui/button";
import { Dialog } from "../../ui/dialog";
import { Field, Input, Textarea } from "../../ui/form";
import { MultiSelect } from "../../ui/multi-select";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

export function MilestoneDialog({ milestone, data, onClose }: { milestone: Milestone | null; data: ProjectData; onClose: () => void }) {
  const { actor, today, run } = useAuthed();
  const { project } = useProject();
  const [f, setF] = useState<MilestoneInput>(
    milestone ? { id: milestone.id, name: milestone.name, description: milestone.description, targetDate: milestone.targetDate, taskIds: milestone.taskIds }
      : { name: "", description: "", targetDate: today, taskIds: [] },
  );
  const taskOptions = [...data.tasks].sort((a, b) => a.number - b.number).map((t) => ({ value: t.id, label: `${taskRef(t)} ${t.title}` }));

  function save() {
    if (run((s) => saveMilestone(s, project.id, f, actor, stamp(today)), milestone ? "Milestone diperbarui." : "Milestone dibuat.")) onClose();
  }

  return (
    <Dialog
      open onOpenChange={(o) => !o && onClose()} title={milestone ? "Edit milestone" : "Milestone baru"}
      footer={<><Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button><Button disabled={!f.name.trim() || !f.targetDate} onClick={save}>Simpan</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Nama milestone" value={f.name} autoFocus onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Target tanggal" type="date" value={f.targetDate} onChange={(e) => setF({ ...f, targetDate: e.target.value })} />
        <Textarea label="Deskripsi" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Field label="Task tertaut" id="ms-tasks">
          <MultiSelect options={taskOptions} value={f.taskIds} onChange={(v) => setF({ ...f, taskIds: v })} searchPlaceholder="Cari task…">
            <button id="ms-tasks" type="button" className="flex min-h-10 w-full flex-wrap items-center gap-1 rounded-xxs bg-sunken px-3 py-1.5 text-left text-sm shadow-[inset_0_0_0_1px_var(--border-default)]">
              {f.taskIds.length === 0 ? <span className="text-fg-subtle">Pilih task…</span> : f.taskIds.map((id) => {
                const t = data.taskById.get(id);
                return t ? <span key={id} className="rounded-xxs bg-hover px-1.5 py-0.5 text-xs">{taskRef(t)} {t.title}</span> : null;
              })}
            </button>
          </MultiSelect>
        </Field>
      </div>
    </Dialog>
  );
}
