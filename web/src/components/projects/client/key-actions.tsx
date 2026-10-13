"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { deleteKeyAction, saveKeyAction, type KeyActionInput } from "@/store/actions-client";
import { stamp } from "@/store/project-core";
import { useLookups } from "../../hooks";
import { Button, IconButton } from "../../ui/button";
import { EmptyState } from "../../ui/display";
import { Icon } from "../../ui/icon";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

const cell = "h-8 rounded-xxs bg-sunken px-2 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border-default)]";

/** Tindak lanjut ke klien: judul, PIC, due date, status (checkbox). */
export function KeyActions({ data }: { data: ProjectData }) {
  const { state, actor, today, run } = useAuthed();
  const { project, canEdit } = useProject();
  const { userName } = useLookups();
  const [form, setForm] = useState<KeyActionInput>({ title: "", ownerId: actor.id, dueDate: null, status: "open" });
  const list = state.keyActions.filter((k) => k.projectId === project.id).sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const at = () => stamp(today);

  function add() {
    if (run((s) => saveKeyAction(s, project.id, form, actor, at()), "Tindak lanjut ditambahkan.")) setForm({ ...form, title: "", dueDate: null });
  }

  return (
    <div className="flex flex-col gap-3">
      {canEdit && (
        <div className="flex flex-wrap gap-2 rounded-s bg-sunken p-3">
          <input className={`${cell} min-w-56 flex-1`} placeholder="Tindak lanjut ke klien" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && form.title.trim() && add()} />
          <select className={cell} value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} aria-label="PIC">
            {data.memberOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input type="date" className={cell} value={form.dueDate ?? ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })} aria-label="Due date" />
          <Button size="small" iconLeft={<Icon icon={Plus} size={14} />} disabled={!form.title.trim()} onClick={add}>Tambah</Button>
        </div>
      )}
      {list.length === 0 ? <EmptyState title="Belum ada tindak lanjut" /> : (
        <ul className="flex flex-col divide-y divide-[var(--border-default)]">
          {list.map((k) => {
            const late = k.status === "open" && k.dueDate !== null && k.dueDate < today;
            return (
              <li key={k.id} className="group flex items-center gap-3 py-2.5">
                <input type="checkbox" aria-label="Selesai" className="size-4 accent-[var(--brand)]" checked={k.status === "done"} disabled={!canEdit}
                  onChange={() => run((s) => saveKeyAction(s, project.id, { ...k, status: k.status === "done" ? "open" : "done" }, actor, at()))} />
                <span className={cn("flex-1 text-sm", k.status === "done" && "text-fg-subtle line-through")}>{k.title}</span>
                <span className="text-xs text-fg-muted">{userName(k.ownerId)}</span>
                <span className={cn("w-24 text-right text-xs", late ? "text-fg-danger" : "text-fg-muted")}>{k.dueDate ? formatDate(k.dueDate) : "–"}</span>
                {canEdit && (
                  <IconButton label="Hapus" size="small" className="opacity-0 group-hover:opacity-100" onClick={() => run((s) => deleteKeyAction(s, k.id, actor, at()), "Tindak lanjut dihapus.")}>
                    <Icon icon={Trash2} size={14} />
                  </IconButton>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
