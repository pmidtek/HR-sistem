"use client";

import { useState } from "react";
import { taskRef } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import type { Sprint } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { completeSprint, saveSprint, setSprintTasks, type SprintInput } from "@/store/actions-sprints";
import { stamp } from "@/store/project-core";
import { useLookups } from "../../hooks";
import { Button } from "../../ui/button";
import { Dialog } from "../../ui/dialog";
import { Input, Select, Textarea } from "../../ui/form";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

const footer = (onClose: () => void, onSave: () => void, label = "Simpan", disabled = false) => (
  <><Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button><Button disabled={disabled} onClick={onSave}>{label}</Button></>
);

export function SprintFormDialog({ sprint, onClose }: { sprint: Sprint | null; onClose: () => void }) {
  const { actor, today, run } = useAuthed();
  const { project } = useProject();
  const { teamName } = useLookups();
  const [f, setF] = useState<SprintInput>(sprint ?? { name: "", teamId: project.teamIds[0] ?? null, goal: "", startDate: today, endDate: today });
  const save = () => run((s) => saveSprint(s, project.id, f, actor, stamp(today)), sprint ? "Sprint diperbarui." : "Sprint dibuat.") && onClose();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={sprint ? "Edit sprint" : "Sprint baru"} footer={footer(onClose, save, "Simpan", !f.name.trim())}>
      <div className="flex flex-col gap-4">
        <Input label="Nama sprint" value={f.name} autoFocus onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Sprint 8" />
        <Select label="Tim (opsional)" value={f.teamId ?? ""} onChange={(e) => setF({ ...f, teamId: e.target.value || null })}
          options={[{ value: "", label: "Tanpa tim" }, ...project.teamIds.map((id) => ({ value: id, label: teamName(id) }))]} />
        <Textarea label="Tujuan sprint" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mulai" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
          <Input label="Selesai" type="date" min={f.startDate} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
        </div>
      </div>
    </Dialog>
  );
}

/** Pilih task masuk/keluar sprint. Task selesai disembunyikan kecuali sudah ada di sprint ini. */
export function SprintTasksDialog({ sprint, data, onClose }: { sprint: Sprint; data: ProjectData; onClose: () => void }) {
  const { actor, today, run } = useAuthed();
  const [chosen, setChosen] = useState<string[]>(data.tasks.filter((t) => t.sprintId === sprint.id).map((t) => t.id));
  const [q, setQ] = useState("");
  const candidates = data.tasks
    .filter((t) => chosen.includes(t.id) || !data.doneCols.has(t.columnId))
    .filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()) || `#${t.number}` === q)
    .sort((a, b) => a.number - b.number);
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const save = () => run((s) => setSprintTasks(s, sprint.id, chosen, actor, stamp(today)), "Task sprint diperbarui.") && onClose();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Atur task · ${sprint.name}`} description={`${chosen.length} task dipilih`} width="lg" footer={footer(onClose, save)}>
      <div className="flex flex-col gap-3">
        <Input size="small" placeholder="Cari judul atau #nomor" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="flex max-h-[50vh] flex-col overflow-y-auto">
          {candidates.map((t) => {
            const other = t.sprintId && t.sprintId !== sprint.id ? data.sprints.find((s) => s.id === t.sprintId)?.name : null;
            return (
              <li key={t.id}>
                <label className={cn("flex cursor-pointer items-center gap-3 rounded-xs px-2 py-2 text-sm hover:bg-hover", chosen.includes(t.id) && "bg-brand-subtle")}>
                  <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={chosen.includes(t.id)} onChange={() => toggle(t.id)} />
                  <span className="w-10 font-mono text-xs text-fg-subtle">{taskRef(t)}</span>
                  <span className="flex-1 truncate">{t.title}</span>
                  {other && <span className="text-xs text-fg-subtle">di {other}</span>}
                  <span className="text-xs text-fg-muted">{data.columnById.get(t.columnId)?.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}

export function CompleteSprintDialog({ sprint, data, onClose }: { sprint: Sprint; data: ProjectData; onClose: () => void }) {
  const { actor, today, run } = useAuthed();
  const unfinished = data.tasks.filter((t) => t.sprintId === sprint.id && !data.doneCols.has(t.columnId));
  const targets = data.sprints.filter((s) => s.id !== sprint.id && s.status === "planned");
  const [moveTo, setMoveTo] = useState(targets[0]?.id ?? "");
  const save = () => run((s) => completeSprint(s, sprint.id, moveTo || null, actor, stamp(today)), `${sprint.name} selesai.`) && onClose();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Selesaikan ${sprint.name}?`} footer={footer(onClose, save, "Selesaikan sprint")}>
      <div className="flex flex-col gap-3 text-sm">
        {unfinished.length === 0 ? <p className="text-fg-muted">Semua task di sprint ini sudah selesai.</p> : (
          <>
            <p className="text-fg-muted">{unfinished.length} task belum selesai. Pindahkan ke:</p>
            <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} options={[...targets.map((s) => ({ value: s.id, label: s.name })), { value: "", label: "Backlog (tanpa sprint)" }]} />
            <ul className="max-h-48 overflow-y-auto text-xs text-fg-muted">
              {unfinished.map((t) => <li key={t.id} className="py-0.5"><span className="font-mono text-fg-subtle">{taskRef(t)}</span> {t.title}</li>)}
            </ul>
          </>
        )}
      </div>
    </Dialog>
  );
}
