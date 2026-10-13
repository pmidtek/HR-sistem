"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ProjectStatus } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { updateGeneral, type GeneralInput } from "@/store/actions-project-settings";
import { stamp } from "@/store/project-core";
import { useLookups } from "../../hooks";
import { projectStatusLabel } from "../../status-badge";
import { Button } from "../../ui/button";
import { Card } from "../../ui/display";
import { Field, Input, Select, Textarea } from "../../ui/form";
import { COLUMN_COLORS } from "../board/column-dialog";
import { useProject } from "../workspace/context";

export function SettingsCard({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-base font-medium">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {children}
      {footer && <div className="flex justify-end gap-2 border-t border-line pt-4">{footer}</div>}
    </Card>
  );
}

export function GeneralForm() {
  const { state, actor, today, run } = useAuthed();
  const { project } = useProject();
  const { userName } = useLookups();
  const initial: GeneralInput = {
    name: project.name, description: project.description, teamIds: project.teamIds, startDate: project.startDate, targetDate: project.targetDate,
    status: project.status, color: project.color, companyId: project.companyId, leadId: project.leadId,
  };
  const [f, setF] = useState<GeneralInput>(initial);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const set = <K extends keyof GeneralInput>(k: K, v: GeneralInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const teams = state.teams.filter((t) => t.kind === "delivery" || f.teamIds.includes(t.id));

  return (
    <SettingsCard title="Umum" description="Kode project tidak bisa diubah karena dipakai di timesheet."
      footer={<><Button variant="secondary" tone="neutral" size="small" disabled={!dirty} onClick={() => setF(initial)}>Batalkan</Button>
        <Button size="small" disabled={!dirty} onClick={() => run((s) => updateGeneral(s, project.id, f, actor, stamp(today)), "Pengaturan disimpan.")}>Simpan</Button></>}>
      <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
        <Input label="Kode" value={project.code} disabled />
        <Input label="Nama project" value={f.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <Textarea label="Deskripsi" value={f.description} onChange={(e) => set("description", e.target.value)} />
      <Field label="Tim pelaksana" id="set-teams">
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => {
            const on = f.teamIds.includes(t.id);
            return (
              <button key={t.id} type="button" onClick={() => set("teamIds", on ? f.teamIds.filter((x) => x !== t.id) : [...f.teamIds, t.id])}
                className={cn("h-8 rounded-xxs px-3 text-sm shadow-[inset_0_0_0_1px_var(--border-strong)]", on ? "bg-brand-subtle text-fg-brand shadow-[inset_0_0_0_1px_var(--brand)]" : "text-fg-muted hover:bg-hover")}>{t.name}</button>
            );
          })}
        </div>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Lead" value={f.leadId} onChange={(e) => set("leadId", e.target.value)} options={project.memberIds.map((id) => ({ value: id, label: userName(id) }))} />
        <Select label="Status" value={f.status} onChange={(e) => set("status", e.target.value as ProjectStatus)} options={Object.entries(projectStatusLabel).map(([value, label]) => ({ value, label }))} />
        <Input label="Tanggal mulai" type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
        <Input label="Target selesai" type="date" min={f.startDate} value={f.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
        <Select label="Klien" value={f.companyId ?? ""} onChange={(e) => set("companyId", e.target.value || null)} options={[{ value: "", label: "Internal (tanpa klien)" }, ...state.companies.map((c) => ({ value: c.id, label: c.name }))]} />
        <Field label="Warna project" id="set-color">
          <div className="flex flex-wrap gap-2">
            {COLUMN_COLORS.map((c) => (
              <button key={c} type="button" aria-label="Pilih warna" onClick={() => set("color", c)} className={cn("size-8 rounded-full", f.color === c && "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface-raised)]")} style={{ background: c }} />
            ))}
          </div>
        </Field>
      </div>
    </SettingsCard>
  );
}
