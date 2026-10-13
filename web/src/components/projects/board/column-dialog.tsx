"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { BoardColumn } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { addColumn, deleteColumn, updateColumn } from "@/store/actions-boards";
import { stamp } from "@/store/project-core";
import { Button } from "../../ui/button";
import { Dialog } from "../../ui/dialog";
import { Input, Select } from "../../ui/form";

export type ColumnDialogMode = "add" | "rename" | "color" | "delete";

/** Warna kolom dari ramp Cartogram. */
export const COLUMN_COLORS = [
  "var(--color-neutral-400)",
  "var(--color-brand-brand-300)",
  "var(--color-brand-brand-500)",
  "var(--color-brand-brand-700)",
  "var(--color-success-500)",
  "var(--color-warning-500)",
  "var(--color-danger-500)",
];

type Props = { boardId: string; mode: ColumnDialogMode; column: BoardColumn | null; columns: BoardColumn[]; taskCount: number; onClose: () => void };

export function ColumnDialog({ boardId, mode, column, columns, taskCount, onClose }: Props) {
  const { actor, today, run } = useAuthed();
  const [name, setName] = useState(column?.name ?? "");
  const [color, setColor] = useState<string | null>(column?.color ?? null);
  const others = columns.filter((c) => c.id !== column?.id);
  const [target, setTarget] = useState(others[0]?.id ?? "");
  const at = () => stamp(today);

  function submit() {
    const ok =
      mode === "add" ? run((s) => addColumn(s, boardId, name, actor, at()), "Kolom ditambahkan.")
      : mode === "rename" && column ? run((s) => updateColumn(s, column.id, { name }, actor, at()), "Kolom diganti nama.")
      : mode === "color" && column ? run((s) => updateColumn(s, column.id, { color }, actor, at()), "Warna kolom diperbarui.")
      : mode === "delete" && column ? run((s) => deleteColumn(s, column.id, taskCount > 0 ? target : null, actor, at()), "Kolom dihapus.")
      : false;
    if (ok) onClose();
  }

  const titles: Record<ColumnDialogMode, string> = { add: "Kolom baru", rename: "Ganti nama kolom", color: "Warna kolom", delete: `Hapus kolom "${column?.name ?? ""}"` };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={titles[mode]}
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button>
          <Button tone={mode === "delete" ? "danger" : "brand"} onClick={submit}>{mode === "delete" ? "Hapus" : "Simpan"}</Button>
        </>
      }
    >
      {(mode === "add" || mode === "rename") && <Input label="Nama kolom" value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />}
      {mode === "color" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setColor(null)} className={cn("h-8 rounded-xxs px-3 text-xs shadow-[inset_0_0_0_1px_var(--border-strong)]", color === null && "shadow-[inset_0_0_0_1.5px_var(--brand)]")}>Tanpa warna</button>
          {COLUMN_COLORS.map((c) => (
            <button key={c} type="button" aria-label="Pilih warna" onClick={() => setColor(c)} className={cn("size-8 rounded-full", color === c && "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface-overlay)]")} style={{ background: c }} />
          ))}
        </div>
      )}
      {mode === "delete" && (
        <div className="flex flex-col gap-3 text-sm">
          {taskCount > 0 ? (
            <>
              <p className="text-fg-muted">Kolom ini berisi {taskCount} task. Pindahkan ke:</p>
              <Select value={target} onChange={(e) => setTarget(e.target.value)} options={others.map((c) => ({ value: c.id, label: c.name }))} />
            </>
          ) : (
            <p className="text-fg-muted">Kolom kosong ini akan dihapus.</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
