"use client";

import { Archive, ArchiveRestore, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProjectLabel } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deleteProject, saveDefaultColumns, saveLabels, setArchived, setQuickLinks } from "@/store/actions-project-settings";
import { stamp } from "@/store/project-core";
import { newId } from "@/store/state";
import { Button, IconButton } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { Icon } from "../../ui/icon";
import { MultiSelect } from "../../ui/multi-select";
import { COLUMN_COLORS } from "../board/column-dialog";
import { useProject } from "../workspace/context";
import { SettingsCard } from "./general-form";

const cell = "h-9 rounded-xxs bg-sunken px-2 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border-default)]";

export function LabelsForm() {
  const { actor, today, run } = useAuthed();
  const { project } = useProject();
  const [labels, setLabels] = useState<ProjectLabel[]>(project.labels);
  const dirty = JSON.stringify(labels) !== JSON.stringify(project.labels);
  const update = (id: string, patch: Partial<ProjectLabel>) => setLabels((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <SettingsCard title="Label" description="Dipakai untuk task. Label yang dihapus otomatis dilepas dari task."
      footer={<><Button variant="secondary" tone="neutral" size="small" disabled={!dirty} onClick={() => setLabels(project.labels)}>Batalkan</Button>
        <Button size="small" disabled={!dirty} onClick={() => run((s) => saveLabels(s, project.id, labels, actor, stamp(today)), "Label disimpan.")}>Simpan</Button></>}>
      {labels.map((l) => (
        <div key={l.id} className="flex flex-wrap items-center gap-2">
          <input className={`${cell} w-48`} value={l.name} onChange={(e) => update(l.id, { name: e.target.value })} aria-label="Nama label" />
          <span className="flex gap-1.5">
            {COLUMN_COLORS.map((c) => <button key={c} type="button" aria-label="Warna label" onClick={() => update(l.id, { color: c })} className={l.color === c ? "size-6 rounded-full ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface-raised)]" : "size-6 rounded-full"} style={{ background: c }} />)}
          </span>
          <IconButton label="Hapus label" size="small" onClick={() => setLabels((x) => x.filter((y) => y.id !== l.id))}><Icon icon={Trash2} size={14} /></IconButton>
        </div>
      ))}
      <Button size="small" variant="ghost" tone="neutral" className="self-start" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setLabels((x) => [...x, { id: newId(`${project.id}-l`), name: "", color: COLUMN_COLORS[2] }])}>Label</Button>
    </SettingsCard>
  );
}

export function ColumnsAndLinksForm() {
  const { state, actor, today, run } = useAuthed();
  const { project } = useProject();
  const [cols, setCols] = useState<string[]>(project.defaultColumns);
  const links = state.projectLinks.filter((l) => l.projectId === project.id);
  const colsDirty = JSON.stringify(cols) !== JSON.stringify(project.defaultColumns);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
      <SettingsCard title="Kolom default board baru" description="Kolom terakhir dianggap kolom selesai."
        footer={<Button size="small" disabled={!colsDirty} onClick={() => run((s) => saveDefaultColumns(s, project.id, cols, actor, stamp(today)), "Kolom default disimpan.")}>Simpan</Button>}>
        {cols.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 font-mono text-xs text-fg-subtle">{i + 1}</span>
            <input className={`${cell} flex-1`} value={c} onChange={(e) => setCols((x) => x.map((y, j) => (j === i ? e.target.value : y)))} aria-label={`Kolom ${i + 1}`} />
            <IconButton label="Hapus kolom" size="small" onClick={() => setCols((x) => x.filter((_, j) => j !== i))}><Icon icon={X} size={14} /></IconButton>
          </div>
        ))}
        <Button size="small" variant="ghost" tone="neutral" className="self-start" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setCols((x) => [...x.slice(0, -1), "", ...x.slice(-1)])}>Kolom</Button>
      </SettingsCard>
      <SettingsCard title="Tautan cepat" description="Maksimal 3 tautan tampil di header project. Kelola tautan di Files → Tautan.">
        <MultiSelect options={links.map((l) => ({ value: l.id, label: l.label, hint: l.category, disabled: !project.quickLinkIds.includes(l.id) && project.quickLinkIds.length >= 3 }))}
          value={project.quickLinkIds} onChange={(v) => run((s) => setQuickLinks(s, project.id, v, actor, stamp(today)))}>
          <button type="button" className={`${cell} flex min-h-9 w-full flex-wrap items-center gap-1 py-1 text-left`}>
            {project.quickLinkIds.length === 0 ? <span className="text-fg-subtle">Pilih tautan…</span> : project.quickLinkIds.map((id) => <span key={id} className="rounded-xxs bg-hover px-2 py-0.5 text-xs">{links.find((l) => l.id === id)?.label}</span>)}
          </button>
        </MultiSelect>
      </SettingsCard>
    </div>
  );
}

export function DangerZone() {
  const { actor, today, run } = useAuthed();
  const { project, canDelete } = useProject();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <SettingsCard title="Danger zone">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-s p-4 shadow-[inset_0_0_0_1px_var(--border-strong)]">
        <div><p className="text-sm">{project.archived ? "Pulihkan dari arsip" : "Arsipkan project"}</p><p className="text-xs text-fg-muted">Project arsip jadi read-only untuk semua kecuali stakeholder.</p></div>
        <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={project.archived ? ArchiveRestore : Archive} size={14} />}
          onClick={() => run((s) => setArchived(s, project.id, !project.archived, actor, stamp(today)), project.archived ? "Project dipulihkan." : "Project diarsipkan.")}>{project.archived ? "Pulihkan" : "Arsipkan"}</Button>
      </div>
      {canDelete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-s p-4 shadow-[inset_0_0_0_1px_var(--danger)]">
          <div><p className="text-sm text-fg-danger">Hapus project</p><p className="text-xs text-fg-muted">Semua board, task, MOM, catatan, dan data lain ikut terhapus permanen.</p></div>
          <Button size="small" tone="danger" iconLeft={<Icon icon={Trash2} size={14} />} onClick={() => setConfirm(true)}>Hapus project</Button>
        </div>
      )}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Hapus ${project.code}?`} description="Tindakan ini tidak bisa dibatalkan." typeToConfirm={project.name} confirmLabel="Hapus permanen"
        onConfirm={() => { if (run((s) => deleteProject(s, project.id, actor), "Project dihapus.")) router.replace("/projects"); }} />
    </SettingsCard>
  );
}
