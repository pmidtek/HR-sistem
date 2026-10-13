"use client";

import { useState } from "react";
import { shiftSpan, xOf, type DragMode, type Span } from "@/lib/calc/gantt";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Task } from "@/lib/types";

type Props = {
  task: Task;
  span: Span;
  rangeStart: string;
  dayWidth: number;
  top: number;
  height: number;
  color: string;
  done: boolean;
  overdue: boolean;
  editable: boolean;
  onOpen: () => void;
  onCommit: (span: Span) => void;
};

type Drag = { mode: DragMode; startX: number; days: number; moved: boolean };

/** Bar task Gantt: klik = buka detail; drag tengah = geser; drag tepi = ubah durasi. */
export function GanttBar({ task, span, rangeStart, dayWidth, top, height, color, done, overdue, editable, onOpen, onCommit }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const shown = drag && drag.days !== 0 ? shiftSpan(span, drag.days, drag.mode) : span;
  const left = xOf(shown.start, rangeStart, dayWidth);
  const width = Math.max(dayWidth, xOf(shown.end, rangeStart, dayWidth) + dayWidth - left);

  const begin = (mode: DragMode) => (e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ mode, startX: e.clientX, days: 0, moved: false });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const days = Math.round((e.clientX - drag.startX) / dayWidth);
    if (days !== drag.days || (!drag.moved && Math.abs(e.clientX - drag.startX) > 3)) setDrag({ ...drag, days, moved: drag.moved || Math.abs(e.clientX - drag.startX) > 3 });
  };
  const end = () => {
    if (!drag) return;
    if (drag.days !== 0) onCommit(shiftSpan(span, drag.days, drag.mode));
    else if (!drag.moved) onOpen();
    setDrag(null);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`#${task.number} ${task.title}, ${formatDate(shown.start)} sampai ${formatDate(shown.end)}`}
      title={`#${task.number} ${task.title}\n${formatDate(shown.start)} – ${formatDate(shown.end)}`}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      onClick={() => !editable && onOpen()}
      onPointerDown={begin("move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={() => setDrag(null)}
      className={cn(
        "group absolute flex items-center overflow-hidden rounded-[4px] text-[11px] select-none",
        editable ? (drag ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer",
        drag && "z-20 shadow-[var(--shadow-md)]",
        overdue && "ring-1 ring-[var(--danger)]",
      )}
      style={{ left, width, top, height, background: `color-mix(in oklab, ${color} ${done ? 22 : 30}%, transparent)`, boxShadow: `inset 3px 0 0 ${color}` }}
    >
      {editable && <span onPointerDown={begin("start")} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)]" />}
      <span className={cn("truncate px-2 pl-2.5", done ? "text-fg-subtle line-through" : "text-fg")}>
        <span className="font-mono text-fg-subtle">#{task.number}</span> {task.title}
      </span>
      {editable && <span onPointerDown={begin("end")} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)]" />}
    </div>
  );
}
