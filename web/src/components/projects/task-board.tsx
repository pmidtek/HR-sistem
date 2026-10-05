"use client";

import { CheckSquare, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { BoardColumn, Task } from "@/lib/types";
import { useLookups } from "../hooks";
import { Avatar, Badge } from "../ui/display";
import { Icon } from "../ui/icon";
import { PriorityBadge } from "./task-bits";

type Props = {
  columns: BoardColumn[];
  tasks: Task[];
  editable: boolean;
  today: string;
  onOpen: (t: Task) => void;
  onAdd: (columnId: string) => void;
  onMove: (taskId: string, columnId: string) => void;
};

export function TaskBoard({ columns, tasks, editable, today, onOpen, onAdd, onMove }: Props) {
  const { userName } = useLookups();
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const list = tasks.filter((t) => t.columnId === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e) => { if (editable) { e.preventDefault(); setOver(col.id); } }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { setOver(null); onMove(e.dataTransfer.getData("text/plain"), col.id); }}
            className={cn("flex w-72 shrink-0 flex-col rounded-s bg-sunken p-2 shadow-[inset_0_0_0_1px_var(--border-default)]", over === col.id && "shadow-[inset_0_0_0_1px_var(--brand)]")}
          >
            <div className="flex items-center justify-between px-2 py-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                {col.name} <span className="font-mono text-[11px] text-fg-subtle">{list.length}</span>
              </span>
              {editable && (
                <button type="button" aria-label={`Tambah task di ${col.name}`} onClick={() => onAdd(col.id)} className="text-fg-subtle hover:text-fg">
                  <Icon icon={Plus} size={16} />
                </button>
              )}
            </div>
            <div className="flex min-h-16 flex-col gap-2">
              {list.map((t) => {
                const done = t.checklist.filter((c) => c.done).length;
                const overdue = !col.isDone && t.deadline !== null && t.deadline < today;
                return (
                  <button
                    key={t.id}
                    type="button"
                    draggable={editable}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    onClick={() => onOpen(t)}
                    className="flex flex-col gap-2 rounded-xs glass p-3 text-left shadow-[inset_0_0_0_1px_var(--border-default)] transition-[transform,box-shadow] duration-[200ms] hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-sm)]"
                  >
                    <span className={cn("text-sm leading-snug", col.isDone && "text-fg-muted line-through")}>{t.title}</span>
                    <span className="flex flex-wrap gap-1">
                      <PriorityBadge priority={t.priority} />
                      {t.labels.map((l) => <Badge key={l}>{l}</Badge>)}
                    </span>
                    <span className="flex items-center justify-between">
                      <span className={cn("font-mono text-[10px]", overdue ? "text-fg-danger" : "text-fg-subtle")}>
                        {t.deadline ? formatDate(t.deadline) : ""}
                        {t.checklist.length > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1"><Icon icon={CheckSquare} size={10} />{done}/{t.checklist.length}</span>
                        )}
                      </span>
                      {t.assigneeId && <Avatar name={userName(t.assigneeId)} size="small" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
