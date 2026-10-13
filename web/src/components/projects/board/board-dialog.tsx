"use client";

import { useState } from "react";
import { useAuthed } from "@/store/app-provider";
import { createBoard, deleteBoard, renameBoard } from "@/store/actions-boards";
import { stamp } from "@/store/project-core";
import { newId } from "@/store/state";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { Dialog } from "../../ui/dialog";
import { Input } from "../../ui/form";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";
import type { BoardDialogMode } from "./board-toolbar";

type Props = { mode: BoardDialogMode; boardId: string; data: ProjectData; onClose: () => void; onSelect: (boardId: string) => void };

export function BoardDialog({ mode, boardId, data, onClose, onSelect }: Props) {
  const { actor, today, run } = useAuthed();
  const { project } = useProject();
  const board = data.boards.find((b) => b.id === boardId);
  const [name, setName] = useState(mode === "rename" ? (board?.name ?? "") : "");
  const taskCount = data.tasks.filter((t) => t.boardId === boardId).length;

  if (mode === "delete" && board) {
    return (
      <ConfirmDialog
        open onOpenChange={(o) => !o && onClose()} title={`Hapus board "${board.name}"?`}
        description={taskCount > 0 ? `${taskCount} task di board ini ikut terhapus.` : "Board kosong ini akan dihapus."}
        typeToConfirm={taskCount > 0 ? board.name : undefined}
        onConfirm={() => {
          if (run((s) => deleteBoard(s, board.id, actor, stamp(today)), "Board dihapus.")) {
            onSelect(data.boards.find((b) => b.id !== board.id)?.id ?? "");
            onClose();
          }
        }}
      />
    );
  }

  function save() {
    if (mode === "rename" && board) {
      if (run((s) => renameBoard(s, board.id, name, actor, stamp(today)), "Board diganti nama.")) onClose();
      return;
    }
    const id = newId("b");
    if (run((s) => createBoard(s, project.id, name, actor, stamp(today), id), "Board dibuat dengan kolom default project.")) {
      onSelect(id);
      onClose();
    }
  }

  return (
    <Dialog
      open onOpenChange={(o) => !o && onClose()} title={mode === "create" ? "Board baru" : "Ganti nama board"}
      description={mode === "create" ? `Kolom awal: ${project.defaultColumns.join(" → ")}` : undefined}
      footer={<><Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button><Button disabled={!name.trim()} onClick={save}>Simpan</Button></>}
    >
      <Input label="Nama board" value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && save()} />
    </Dialog>
  );
}
