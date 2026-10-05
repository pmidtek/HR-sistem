"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { Task, TaskPriority } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { saveTask } from "@/store/actions-business";
import { useLookups } from "../hooks";
import { Button, IconButton } from "../ui/button";
import { Combobox } from "../ui/combobox";
import { Dialog } from "../ui/dialog";
import { Input, Select } from "../ui/form";
import { Icon } from "../ui/icon";
import { priorityLabel } from "./task-bits";

export type TaskDraft = Omit<Task, "id"> & { id?: string };

export function TaskDialog({ initial, memberIds, readOnly, onClose }: { initial: TaskDraft; memberIds: string[]; readOnly: boolean; onClose: () => void }) {
  const { state, user, run } = useAuthed();
  const { userOptions } = useLookups();
  const [t, setT] = useState<TaskDraft>(initial);
  const [newItem, setNewItem] = useState("");
  const set = <K extends keyof TaskDraft>(k: K, v: TaskDraft[K]) => setT((x) => ({ ...x, [k]: v }));
  const columns = state.boardColumns.filter((c) => c.projectId === t.projectId).sort((a, b) => a.order - b.order);

  function save() {
    if (!t.title.trim()) return;
    if (run((s) => saveTask(s, t, user.id), t.id ? "Task diperbarui." : "Task dibuat.")) onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t.id ? "Detail task" : "Task baru"}
      footer={!readOnly && (
        <>
          <Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={!t.title.trim()}>Simpan</Button>
        </>
      )}
    >
      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        <Input label="Judul" value={t.title} onChange={(e) => set("title", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Kolom" value={t.columnId} onChange={(e) => set("columnId", e.target.value)} options={columns.map((c) => ({ value: c.id, label: c.name }))} />
          <Select label="Prioritas" value={t.priority} onChange={(e) => set("priority", e.target.value as TaskPriority)} options={Object.entries(priorityLabel).map(([value, label]) => ({ value, label }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Combobox label="Assignee" value={t.assigneeId ?? ""} onChange={(v) => set("assigneeId", v)} options={userOptions.filter((o) => memberIds.includes(o.value))} placeholder="Belum di-assign" />
          <Input label="Deadline" type="date" value={t.deadline ?? ""} onChange={(e) => set("deadline", e.target.value || null)} />
        </div>
        <Input label="Label (pisahkan dengan koma)" value={t.labels.join(", ")} onChange={(e) => set("labels", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-fg-muted">Checklist</p>
          {t.checklist.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={c.done} className="accent-[var(--brand)]" onChange={() => set("checklist", t.checklist.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />
              <span className={c.done ? "flex-1 text-fg-subtle line-through" : "flex-1"}>{c.text}</span>
              <IconButton label="Hapus" size="small" onClick={() => set("checklist", t.checklist.filter((_, j) => j !== i))}><Icon icon={X} size={12} /></IconButton>
            </div>
          ))}
          <div className="flex gap-2">
            <Input size="small" placeholder="Tambah subtask" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
            <IconButton label="Tambah subtask" size="small" variant="secondary" onClick={() => { if (newItem.trim()) { set("checklist", [...t.checklist, { text: newItem.trim(), done: false }]); setNewItem(""); } }}>
              <Icon icon={Plus} size={14} />
            </IconButton>
          </div>
        </div>
      </fieldset>
    </Dialog>
  );
}
