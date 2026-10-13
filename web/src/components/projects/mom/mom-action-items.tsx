"use client";

import { ArrowUpRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { taskRef } from "@/lib/calc/project";
import type { MomActionItem } from "@/lib/project-types";
import { newId } from "@/store/state";
import { Button, IconButton } from "../../ui/button";
import { Icon } from "../../ui/icon";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

const cell = "h-8 w-full rounded-xxs bg-sunken px-2 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border-default)]";

type Props = {
  items: MomActionItem[];
  data: ProjectData;
  editable: boolean;
  onChange: (items: MomActionItem[]) => void;
  /** Buat task dari item yang sudah tersimpan. */
  onToTask: (itemId: string, boardId: string) => void;
  /** Item yang belum disimpan tidak bisa dijadikan task. */
  savedIds: Set<string>;
};

/** Action item MOM: teks, PIC, due date, selesai, dan "Jadikan task". */
export function MomActionItems({ items, data, editable, onChange, onToTask, savedIds }: Props) {
  const { base } = useProject();
  const [boardFor, setBoardFor] = useState<Record<string, string>>({});
  const update = (id: string, patch: Partial<MomActionItem>) => onChange(items.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && <p className="text-xs text-fg-subtle">Belum ada action item.</p>}
      {items.map((a) => {
        const task = a.taskId ? data.taskById.get(a.taskId) : undefined;
        return (
          <div key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xs p-3 shadow-[inset_0_0_0_1px_var(--border-default)] md:grid-cols-[auto_minmax(0,1fr)_160px_140px_auto]">
            <input type="checkbox" aria-label="Selesai" className="mt-2 size-4 accent-[var(--brand)]" checked={a.done} disabled={!editable} onChange={() => update(a.id, { done: !a.done })} />
            <input className={cell} value={a.text} disabled={!editable} placeholder="Tindak lanjut" onChange={(e) => update(a.id, { text: e.target.value })} />
            <select className={`${cell} col-start-2 md:col-start-auto`} value={a.assigneeId ?? ""} disabled={!editable} onChange={(e) => update(a.id, { assigneeId: e.target.value || null })} aria-label="PIC">
              <option value="">Tanpa PIC</option>
              {data.memberOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input type="date" className={`${cell} col-start-2 md:col-start-auto`} value={a.dueDate ?? ""} disabled={!editable} onChange={(e) => update(a.id, { dueDate: e.target.value || null })} aria-label="Due date" />
            {editable && (
              <IconButton label="Hapus action item" size="small" className="col-start-2 justify-self-end md:col-start-auto" onClick={() => onChange(items.filter((x) => x.id !== a.id))}>
                <Icon icon={Trash2} size={14} />
              </IconButton>
            )}
            <div className="col-start-2 flex flex-wrap items-center gap-2 text-xs md:col-span-4">
              {task ? (
                <Link href={`${base}/board?board=${task.boardId}&task=${task.id}`} className="inline-flex items-center gap-1 text-fg-brand hover:underline">
                  Task {taskRef(task)} <Icon icon={ArrowUpRight} size={12} />
                </Link>
              ) : editable && savedIds.has(a.id) && a.text.trim() ? (
                <>
                  <select className="h-7 rounded-xxs bg-sunken px-2 text-xs shadow-[inset_0_0_0_1px_var(--border-default)]" aria-label="Board tujuan"
                    value={boardFor[a.id] ?? data.boards[0]?.id ?? ""} onChange={(e) => setBoardFor((x) => ({ ...x, [a.id]: e.target.value }))}>
                    {data.boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <Button size="small" variant="secondary" tone="neutral" onClick={() => onToTask(a.id, boardFor[a.id] ?? data.boards[0]?.id ?? "")}>Jadikan task</Button>
                </>
              ) : editable ? <span className="text-fg-subtle">Simpan dulu untuk menjadikan task.</span> : null}
            </div>
          </div>
        );
      })}
      {editable && (
        <Button size="small" variant="ghost" tone="neutral" className="self-start" iconLeft={<Icon icon={Plus} size={14} />}
          onClick={() => onChange([...items, { id: newId("ai"), text: "", assigneeId: null, dueDate: null, done: false, taskId: null }])}>
          Action item
        </Button>
      )}
    </div>
  );
}
