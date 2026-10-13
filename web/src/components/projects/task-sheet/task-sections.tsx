"use client";

import { Paperclip, Plus, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { createsCycle, taskRef } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/types";
import type { TaskPatch } from "@/store/actions-tasks";
import { newId } from "@/store/state";
import { IconButton } from "../../ui/button";
import { Icon } from "../../ui/icon";
import { Markdown } from "../../ui/markdown";
import { MultiSelect } from "../../ui/multi-select";
import { Tabs } from "../../ui/tabs";
import type { ProjectData } from "../use-project-data";

export function SheetSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-line pt-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-medium text-fg">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Deskripsi markdown: tab Tulis / Pratinjau; tersimpan saat fokus keluar. */
export function TaskDescription({ value, editable, onSave }: { value: string; editable: boolean; onSave: (v: string) => void }) {
  const [mode, setMode] = useState<"write" | "preview">(editable && !value.trim() ? "write" : "preview");
  const [draft, setDraft] = useState(value);
  return (
    <SheetSection title="Deskripsi" aside={editable && <Tabs variant="pill" value={mode} onChange={setMode} tabs={[{ value: "write", label: "Tulis" }, { value: "preview", label: "Pratinjau" }]} />}>
      {mode === "write" && editable ? (
        <textarea
          value={draft} rows={8} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft !== value && onSave(draft)}
          placeholder="Markdown didukung: **tebal**, - daftar, `kode`, [tautan](https://…)"
          className="w-full resize-y rounded-xxs bg-sunken p-3 font-mono text-[13px] text-fg shadow-[inset_0_0_0_1px_var(--border-default)] focus:shadow-[inset_0_0_0_1px_var(--brand)] focus:outline-none"
        />
      ) : (
        <Markdown>{draft}</Markdown>
      )}
    </SheetSection>
  );
}

export function TaskSubtasks({ task, editable, onPatch }: { task: Task; editable: boolean; onPatch: (p: TaskPatch) => void }) {
  const [text, setText] = useState("");
  const done = task.checklist.filter((c) => c.done).length;
  const add = () => {
    if (!text.trim()) return;
    onPatch({ checklist: [...task.checklist, { id: newId("ck"), text: text.trim(), done: false }] });
    setText("");
  };
  return (
    <SheetSection title="Subtask" aside={task.checklist.length > 0 && <span className="font-mono text-xs text-fg-muted">{done}/{task.checklist.length}</span>}>
      {task.checklist.map((c) => (
        <label key={c.id} className="group flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={c.done} disabled={!editable} className="size-4 accent-[var(--brand)]" onChange={() => onPatch({ checklist: task.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })} />
          <span className={cn("flex-1", c.done && "text-fg-subtle line-through")}>{c.text}</span>
          {editable && (
            <IconButton label="Hapus subtask" size="small" className="opacity-0 group-hover:opacity-100" onClick={() => onPatch({ checklist: task.checklist.filter((x) => x.id !== c.id) })}>
              <Icon icon={X} size={12} />
            </IconButton>
          )}
        </label>
      ))}
      {editable && (
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Tambah subtask lalu Enter" className="h-8 flex-1 rounded-xxs bg-sunken px-2 text-sm shadow-[inset_0_0_0_1px_var(--border-default)]" />
          <IconButton label="Tambah subtask" size="small" variant="secondary" onClick={add}><Icon icon={Plus} size={14} /></IconButton>
        </div>
      )}
    </SheetSection>
  );
}

/** Dependensi: pilihan yang akan membuat lingkaran dinonaktifkan. */
export function TaskDependencies({ task, data, editable, onPatch, onOpen }: { task: Task; data: ProjectData; editable: boolean; onPatch: (p: TaskPatch) => void; onOpen: (id: string) => void }) {
  const options = data.tasks
    .filter((x) => x.id !== task.id)
    .sort((a, b) => a.number - b.number)
    .map((x) => ({ value: x.id, label: `${taskRef(x)} ${x.title}`, disabled: !task.dependsOn.includes(x.id) && createsCycle(data.tasks, task.id, [...task.dependsOn, x.id]) }));
  return (
    <SheetSection
      title="Bergantung pada"
      aside={editable && (
        <MultiSelect options={options} value={task.dependsOn} onChange={(v) => onPatch({ dependsOn: v })} searchPlaceholder="Cari task…" align="end">
          <button type="button" className="text-xs text-fg-brand hover:underline">Ubah</button>
        </MultiSelect>
      )}
    >
      {task.dependsOn.length === 0 && <p className="text-xs text-fg-subtle">Tidak bergantung pada task lain.</p>}
      {task.dependsOn.map((id) => {
        const dep = data.taskById.get(id);
        if (!dep) return null;
        const done = data.doneCols.has(dep.columnId);
        return (
          <button key={id} type="button" onClick={() => onOpen(id)} className="flex items-center gap-2 rounded-xxs px-2 py-1.5 text-left text-sm hover:bg-hover">
            <span className={cn("size-2 rounded-full", done ? "bg-success" : "bg-warning")} />
            <span className="font-mono text-xs text-fg-subtle">{taskRef(dep)}</span>
            <span className={cn("flex-1 truncate", done && "text-fg-subtle line-through")}>{dep.title}</span>
          </button>
        );
      })}
    </SheetSection>
  );
}

export function TaskAttachments({ task, editable, onAdd, onRemove }: { task: Task; editable: boolean; onAdd: (f: { name: string; size: number }) => void; onRemove: (id: string) => void }) {
  const kb = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
  return (
    <SheetSection
      title="Lampiran"
      aside={editable && (
        <label className="cursor-pointer text-xs text-fg-brand hover:underline">
          Unggah
          <input type="file" multiple className="sr-only" onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => onAdd({ name: f.name, size: f.size })); e.target.value = ""; }} />
        </label>
      )}
    >
      {task.attachments.length === 0 && <p className="text-xs text-fg-subtle">Belum ada lampiran. (Unggah masih simulasi sampai backend tersedia.)</p>}
      {task.attachments.map((a) => (
        <div key={a.id} className="flex items-center gap-2.5 rounded-xxs bg-sunken px-3 py-2 text-sm">
          <Icon icon={Paperclip} size={14} className="text-fg-subtle" />
          <span className="flex-1 truncate">{a.name}</span>
          <span className="font-mono text-[11px] text-fg-subtle">{kb(a.size)}</span>
          {editable && <IconButton label="Hapus lampiran" size="small" onClick={() => onRemove(a.id)}><Icon icon={Trash2} size={12} /></IconButton>}
        </div>
      ))}
    </SheetSection>
  );
}
