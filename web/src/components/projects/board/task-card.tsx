"use client";

import { Ban, CheckSquare, MessageSquare, Paperclip } from "lucide-react";
import { isOverdue, taskRef } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Task } from "@/lib/types";
import { useLookups } from "../../hooks";
import { Icon } from "../../ui/icon";
import { AvatarStack, LabelChip, PriorityBadge } from "../task-bits";
import type { ProjectData } from "../use-project-data";

type Props = {
  task: Task;
  data: ProjectData;
  today: string;
  draggable: boolean;
  dropBefore: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragOverCard: () => void;
  onDropOnCard: () => void;
};

/** Kartu task kanban: judul, #nomor, prioritas, assignee, deadline, label, subtask, komentar, lampiran, blocked. */
export function TaskCard({ task: t, data, today, draggable, dropBefore, onOpen, onDragStart, onDragOverCard, onDropOnCard }: Props) {
  const { userName } = useLookups();
  const done = data.doneCols.has(t.columnId);
  const overdue = isOverdue(t, data.doneCols, today);
  const subDone = t.checklist.filter((c) => c.done).length;

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOverCard();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDropOnCard();
      }}
    >
      {dropBefore && <span className="absolute -top-1.5 right-1 left-1 h-0.5 rounded-pill bg-brand" />}
      <button
        type="button"
        draggable={draggable}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", t.id);
          onDragStart();
        }}
        onClick={onOpen}
        className={cn(
          "glass flex w-full flex-col gap-2 rounded-xs p-3 text-left shadow-[inset_0_0_0_1px_var(--border-default)]",
          "transition-[transform,box-shadow] duration-[200ms] hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-sm)]",
          t.blocked && "shadow-[inset_3px_0_0_var(--danger),inset_0_0_0_1px_var(--border-default)]",
        )}
      >
        <span className="flex items-start justify-between gap-2">
          <span className={cn("text-sm leading-snug", done ? "text-fg-muted line-through" : "text-fg")}>{t.title}</span>
          <span className="shrink-0 font-mono text-[10px] text-fg-subtle">{taskRef(t)}</span>
        </span>
        <span className="flex flex-wrap items-center gap-1">
          <PriorityBadge priority={t.priority} />
          {t.blocked && (
            <span className="inline-flex h-6 items-center gap-1 rounded-xxs bg-danger-subtle px-1.5 text-xs text-fg-danger">
              <Icon icon={Ban} size={12} /> Blocked
            </span>
          )}
          {t.labels.map((id) => {
            const label = data.labelById.get(id);
            return label ? <LabelChip key={id} label={label} /> : null;
          })}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2.5 font-mono text-[10px] text-fg-subtle">
            {t.deadline && <span className={overdue ? "text-fg-danger" : undefined}>{formatDate(t.deadline)}</span>}
            {t.checklist.length > 0 && <span className="inline-flex items-center gap-1"><Icon icon={CheckSquare} size={11} />{subDone}/{t.checklist.length}</span>}
            {t.comments.length > 0 && <span className="inline-flex items-center gap-1"><Icon icon={MessageSquare} size={11} />{t.comments.length}</span>}
            {t.attachments.length > 0 && <span className="inline-flex items-center gap-1"><Icon icon={Paperclip} size={11} />{t.attachments.length}</span>}
          </span>
          <AvatarStack names={t.assigneeIds.map((id) => userName(id))} />
        </span>
      </button>
    </div>
  );
}
