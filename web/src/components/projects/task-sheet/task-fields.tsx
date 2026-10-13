"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Task, TaskPriority } from "@/lib/types";
import type { TaskPatch } from "@/store/actions-tasks";
import { useLookups } from "../../hooks";
import { Switch } from "../../ui/form";
import { MultiSelect } from "../../ui/multi-select";
import { AvatarStack, LabelChip, priorityLabel } from "../task-bits";
import type { ProjectData } from "../use-project-data";

const control = "h-8 w-full rounded-xxs bg-sunken px-2 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border-default)] disabled:opacity-60";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs text-fg-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

type Props = { task: Task; data: ProjectData; editable: boolean; onPatch: (p: TaskPatch) => void };

/** Properti task: status, assignee, prioritas, label, epic/story, sprint, jadwal, blocked. */
export function TaskFields({ task: t, data, editable, onPatch }: Props) {
  const { userName } = useLookups();
  const boardCols = data.columns.filter((c) => c.boardId === t.boardId);
  const sprints = data.sprints.filter((s) => s.status !== "completed" || s.id === t.sprintId);

  return (
    <div className="flex flex-col gap-2.5">
      <Row label="Status">
        <select className={control} disabled={!editable} value={t.columnId} onChange={(e) => onPatch({ columnId: e.target.value })}>
          {boardCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Row>
      <Row label="Assignee">
        <MultiSelect options={data.memberOptions} value={t.assigneeIds} onChange={(v) => onPatch({ assigneeIds: v })} disabled={!editable} searchPlaceholder="Cari anggota…">
          <button type="button" className={cn(control, "flex items-center gap-2 text-left")} disabled={!editable}>
            {t.assigneeIds.length ? (
              <><AvatarStack names={t.assigneeIds.map((id) => userName(id))} /><span className="truncate text-xs text-fg-muted">{t.assigneeIds.map((id) => userName(id).split(" ")[0]).join(", ")}</span></>
            ) : <span className="text-fg-subtle">Belum di-assign</span>}
          </button>
        </MultiSelect>
      </Row>
      <Row label="Prioritas">
        <select className={control} disabled={!editable} value={t.priority} onChange={(e) => onPatch({ priority: e.target.value as TaskPriority })}>
          {Object.entries(priorityLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Row>
      <Row label="Label">
        <MultiSelect options={data.labelOptions} value={t.labels} onChange={(v) => onPatch({ labels: v })} disabled={!editable}>
          <button type="button" className={cn(control, "flex h-auto min-h-8 flex-wrap items-center gap-1 py-1 text-left")} disabled={!editable}>
            {t.labels.length ? t.labels.map((id) => { const l = data.labelById.get(id); return l ? <LabelChip key={id} label={l} /> : null; }) : <span className="text-fg-subtle">Tanpa label</span>}
          </button>
        </MultiSelect>
      </Row>
      <Row label="Epic / story">
        <select className={control} disabled={!editable} value={t.storyId ?? ""} onChange={(e) => onPatch({ storyId: e.target.value || null })}>
          <option value="">Tanpa story</option>
          {data.epics.map((e) => (
            <optgroup key={e.id} label={e.title}>
              {data.stories.filter((s) => s.epicId === e.id).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </optgroup>
          ))}
        </select>
      </Row>
      <Row label="Sprint">
        <select className={control} disabled={!editable} value={t.sprintId ?? ""} onChange={(e) => onPatch({ sprintId: e.target.value || null })}>
          <option value="">Backlog (tanpa sprint)</option>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status === "active" ? " (aktif)" : ""}</option>)}
        </select>
      </Row>
      <Row label="Jadwal">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" aria-label="Tanggal mulai" className={control} disabled={!editable} value={t.startDate ?? ""} max={t.deadline ?? undefined} onChange={(e) => onPatch({ startDate: e.target.value || null })} />
          <input type="date" aria-label="Deadline" className={control} disabled={!editable} value={t.deadline ?? ""} min={t.startDate ?? undefined} onChange={(e) => onPatch({ deadline: e.target.value || null })} />
        </div>
      </Row>
      <Row label="Estimasi (jam)">
        <input
          type="number" min={0} step={0.5} className={control} disabled={!editable} defaultValue={t.estimateHours ?? ""} key={`est-${t.estimateHours}`}
          onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== t.estimateHours) onPatch({ estimateHours: v }); }}
        />
      </Row>
      <Row label="Blocked">
        <div className="flex flex-col gap-2">
          <Switch checked={t.blocked} disabled={!editable} onChange={(v) => onPatch(v ? { blocked: true, blockedReason: t.blockedReason ?? "Belum ada alasan" } : { blocked: false })} label={t.blocked ? "Ya" : "Tidak"} />
          {t.blocked && (
            <input
              className={control} disabled={!editable} placeholder="Alasan blocked" defaultValue={t.blockedReason ?? ""} key={`br-${t.blockedReason}`}
              onBlur={(e) => e.target.value.trim() && e.target.value !== t.blockedReason && onPatch({ blockedReason: e.target.value.trim() })}
            />
          )}
        </div>
      </Row>
    </div>
  );
}
