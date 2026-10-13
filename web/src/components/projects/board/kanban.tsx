"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { BoardColumn, Task } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { updateColumn } from "@/store/actions-boards";
import { moveTask } from "@/store/actions-tasks";
import { stamp } from "@/store/project-core";
import { Icon } from "../../ui/icon";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";
import { ColumnDialog, type ColumnDialogMode } from "./column-dialog";
import { ColumnMenu } from "./column-menu";
import { TaskCard } from "./task-card";

type Props = {
  boardId: string;
  tasks: Task[];
  data: ProjectData;
  onOpenTask: (id: string) => void;
  onNewTask: (columnId: string) => void;
};

type DropTarget = { columnId: string; beforeId: string | null };

/** Kanban satu board: drag & drop antar kolom dan ubah urutan dalam kolom. */
export function Kanban({ boardId, tasks, data, onOpenTask, onNewTask }: Props) {
  const { actor, today, run } = useAuthed();
  const { canEdit, canManage } = useProject();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);
  const [dialog, setDialog] = useState<{ mode: ColumnDialogMode; column: BoardColumn | null } | null>(null);
  const columns = data.columns.filter((c) => c.boardId === boardId);

  function drop(target: DropTarget) {
    if (dragId && target.beforeId !== dragId) run((s) => moveTask(s, dragId, target.columnId, target.beforeId, actor, stamp(today)));
    setDragId(null);
    setOver(null);
  }

  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-4" onDragEnd={() => { setDragId(null); setOver(null); }}>
      {columns.map((col) => {
        const list = tasks.filter((t) => t.columnId === col.id).sort((a, b) => a.order - b.order);
        const isOver = over?.columnId === col.id;
        return (
          <section
            key={col.id}
            aria-label={col.name}
            onDragOver={(e) => {
              if (!canEdit || !dragId) return;
              e.preventDefault();
              if (!isOver || over?.beforeId !== null) setOver({ columnId: col.id, beforeId: null });
            }}
            onDrop={(e) => {
              e.preventDefault();
              drop({ columnId: col.id, beforeId: null });
            }}
            className={cn(
              "flex max-h-[calc(100vh-260px)] min-h-40 w-72 shrink-0 flex-col rounded-s bg-sunken p-2 shadow-[inset_0_0_0_1px_var(--border-default)] transition-shadow",
              isOver && "shadow-[inset_0_0_0_1px_var(--brand)]",
            )}
          >
            <header className="flex items-center gap-2 px-2 py-1.5">
              {col.color && <span className="size-2 rounded-full" style={{ background: col.color }} />}
              <span className="text-sm font-medium text-fg">{col.name}</span>
              <span className="font-mono text-[11px] text-fg-subtle">{list.length}</span>
              {col.isDone && <span className="rounded-xxs bg-success-subtle px-1.5 text-[10px] text-fg-success">selesai</span>}
              <span className="ml-auto flex items-center">
                {canEdit && (
                  <button type="button" aria-label={`Tambah task di ${col.name}`} onClick={() => onNewTask(col.id)} className="rounded-xxs p-1 text-fg-subtle hover:bg-hover hover:text-fg">
                    <Icon icon={Plus} size={14} />
                  </button>
                )}
                {canManage && (
                  <ColumnMenu
                    column={col}
                    onOpen={(mode) => setDialog({ mode, column: col })}
                    onToggleDone={() => run((s) => updateColumn(s, col.id, { isDone: !col.isDone }, actor, stamp(today)), col.isDone ? "Kolom tidak lagi dihitung selesai." : "Kolom ditandai sebagai kolom selesai.")}
                  />
                )}
              </span>
            </header>
            <div className="flex min-h-8 flex-col gap-2 overflow-y-auto p-0.5">
              {list.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  data={data}
                  today={today}
                  draggable={canEdit}
                  dropBefore={isOver && over?.beforeId === t.id && dragId !== t.id}
                  onOpen={() => onOpenTask(t.id)}
                  onDragStart={() => setDragId(t.id)}
                  onDragOverCard={() => canEdit && dragId && setOver({ columnId: col.id, beforeId: t.id })}
                  onDropOnCard={() => drop({ columnId: col.id, beforeId: t.id })}
                />
              ))}
              {isOver && over?.beforeId === null && dragId && <span className="h-0.5 rounded-pill bg-brand" />}
            </div>
          </section>
        );
      })}
      {canManage && (
        <button
          type="button"
          onClick={() => setDialog({ mode: "add", column: null })}
          className="flex h-11 w-56 shrink-0 items-center justify-center gap-1.5 rounded-s border border-dashed border-line-strong text-sm text-fg-muted hover:bg-hover hover:text-fg"
        >
          <Icon icon={Plus} size={14} /> Kolom
        </button>
      )}
      {dialog && <ColumnDialog boardId={boardId} mode={dialog.mode} column={dialog.column} columns={columns} taskCount={dialog.column ? tasks.filter((t) => t.columnId === dialog.column?.id).length : 0} onClose={() => setDialog(null)} />}
    </div>
  );
}
