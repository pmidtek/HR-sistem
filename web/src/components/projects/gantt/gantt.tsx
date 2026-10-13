"use client";

import { Diamond, Package } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ganttRange, taskSpan, ticks, xOf, DAY_WIDTH, type GanttZoom } from "@/lib/calc/gantt";
import { isOverdue, taskRef } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Task } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { updateTask } from "@/store/actions-tasks";
import { stamp } from "@/store/project-core";
import { EmptyState } from "../../ui/display";
import { Icon } from "../../ui/icon";
import { Tabs } from "../../ui/tabs";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";
import { GanttBar } from "./gantt-bar";

const ROW = 34;
const GROUP = 28;
/** Lajur atas: label tanggal + penanda milestone & deliverable. */
const LANE = 48;
type Row = { kind: "group"; label: string; color: string | null } | { kind: "task"; task: Task };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tickLabel = (d: string, zoom: GanttZoom) => (zoom === "month" ? `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(2, 4)}` : `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`);

/** Gantt lintas board: grup per epic, panah dependensi, milestone, deliverable, garis hari ini, drag jadwal. */
export function Gantt({ tasks, data, onOpenTask }: { tasks: Task[]; data: ProjectData; onOpenTask: (id: string) => void }) {
  const { state, actor, today, run } = useAuthed();
  const { project, canEdit } = useProject();
  const [zoom, setZoom] = useState<GanttZoom>("week");
  const scroller = useRef<HTMLDivElement>(null);
  const dw = DAY_WIDTH[zoom];
  const milestones = state.milestones.filter((m) => m.projectId === project.id);
  const deliverables = state.deliverables.filter((d) => d.projectId === project.id && d.deadline);

  const rows = useMemo<Row[]>(() => {
    const scheduled = tasks.filter((t) => taskSpan(t)).sort((a, b) => (taskSpan(a)?.start ?? "").localeCompare(taskSpan(b)?.start ?? ""));
    const epicOf = (t: Task) => (t.storyId ? data.storyEpic.get(t.storyId) : undefined);
    const out: Row[] = [];
    for (const e of data.epics) {
      const list = scheduled.filter((t) => epicOf(t) === e.id);
      if (list.length) out.push({ kind: "group", label: e.title, color: e.color }, ...list.map((task) => ({ kind: "task" as const, task })));
    }
    const noEpic = scheduled.filter((t) => !epicOf(t));
    if (noEpic.length) out.push({ kind: "group", label: "Tanpa epic", color: null }, ...noEpic.map((task) => ({ kind: "task" as const, task })));
    const unscheduled = tasks.filter((t) => !taskSpan(t));
    if (unscheduled.length) out.push({ kind: "group", label: "Belum dijadwalkan", color: null }, ...unscheduled.map((task) => ({ kind: "task" as const, task })));
    return out;
  }, [tasks, data]);

  const dates = [today, project.startDate, project.targetDate, ...milestones.map((m) => m.targetDate), ...tasks.flatMap((t) => { const s = taskSpan(t); return s ? [s.start, s.end] : []; })];
  const range = ganttRange(dates, zoom === "month" ? 10 : 3);
  const width = xOf(range.end, range.start, dw) + dw;
  const tickList = ticks(range, zoom);
  const todayX = xOf(today, range.start, dw);

  // Saat dibuka / ganti zoom: gulir supaya "hari ini" terlihat di sepertiga kiri.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, todayX - el.clientWidth / 3);
  }, [todayX]);

  // Posisi vertikal tiap baris (kumulatif), dihitung tanpa mutasi variabel luar.
  const layout = rows.reduce<{ r: Row; top: number }[]>((acc, r) => {
    const prev = acc[acc.length - 1];
    const top = prev ? prev.top + (prev.r.kind === "group" ? GROUP : ROW) : LANE;
    return [...acc, { r, top }];
  }, []);
  const last = layout[layout.length - 1];
  const height = last ? last.top + (last.r.kind === "group" ? GROUP : ROW) : LANE;
  const tops = new Map(layout.flatMap(({ r, top }) => (r.kind === "task" ? [[r.task.id, top] as const] : [])));

  if (tasks.length === 0) return <EmptyState title="Tidak ada task" description="Ubah filter untuk melihat jadwal." />;

  const arrows = tasks.flatMap((t) => {
    const s = taskSpan(t);
    const ty = tops.get(t.id);
    if (!s || ty === undefined) return [];
    return t.dependsOn.flatMap((depId) => {
      const dep = data.taskById.get(depId);
      const ds = dep ? taskSpan(dep) : null;
      const dy = tops.get(depId);
      if (!ds || dy === undefined) return [];
      const x1 = xOf(ds.end, range.start, dw) + dw;
      const x2 = xOf(s.start, range.start, dw);
      const y1 = dy + ROW / 2;
      const y2 = ty + ROW / 2;
      const mid = Math.max(x1 + 6, Math.min(x2 - 6, x1 + 12));
      return [{ id: `${depId}-${t.id}`, d: `M${x1},${y1} H${mid} V${y2} H${x2 - 2}` }];
    });
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted">{canEdit ? "Seret bar untuk menggeser jadwal, tarik tepinya untuk mengubah durasi. Klik untuk detail." : "Klik bar untuk melihat detail task."}</p>
        <Tabs variant="pill" value={zoom} onChange={setZoom} tabs={[{ value: "day", label: "Hari" }, { value: "week", label: "Minggu" }, { value: "month", label: "Bulan" }]} />
      </div>
      <div className="glass grid grid-cols-[minmax(150px,240px)_minmax(0,1fr)] overflow-hidden rounded-s shadow-[inset_0_0_0_1px_var(--border-default)]">
        <div className="border-r border-line">
          <div className="flex items-center border-b border-line px-3 font-mono text-[10px] tracking-[0.08em] text-fg-subtle uppercase" style={{ height: LANE }}>Task</div>
          {layout.map(({ r }, i) => r.kind === "group" ? (
            <div key={`g${i}`} className="flex items-center gap-2 bg-sunken px-3 text-xs font-medium text-fg-muted" style={{ height: GROUP }}>
              {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}{r.label}
            </div>
          ) : (
            <button key={r.task.id} type="button" onClick={() => onOpenTask(r.task.id)} className="flex w-full items-center gap-2 border-b border-line px-3 text-left text-xs hover:bg-hover" style={{ height: ROW }}>
              <span className="font-mono text-fg-subtle">{taskRef(r.task)}</span>
              <span className={cn("truncate", data.doneCols.has(r.task.columnId) && "text-fg-subtle line-through")}>{r.task.title}</span>
            </button>
          ))}
        </div>
        <div ref={scroller} className="overflow-x-auto">
          <div className="relative" style={{ width, height }}>
            {tickList.map((d) => (
              <div key={d} className="absolute top-0 bottom-0 border-l border-[var(--chart-grid)]" style={{ left: xOf(d, range.start, dw) }}>
                <span className="absolute top-2 left-1 font-mono text-[10px] whitespace-nowrap text-fg-subtle">{tickLabel(d, zoom)}</span>
              </div>
            ))}
            <div className="absolute top-0 bottom-0 w-px bg-brand" style={{ left: todayX + dw / 2 }} title={`Hari ini ${formatDate(today)}`} />
            {layout.map(({ r, top }, i) => r.kind === "group" ? <div key={`gb${i}`} className="absolute right-0 left-0 bg-sunken" style={{ top, height: GROUP }} /> : null)}
            {milestones.map((m) => (
              <span key={m.id} title={`Milestone: ${m.name} (${formatDate(m.targetDate)})`} className={cn("absolute -translate-x-1/2", m.completedAt ? "text-fg-success" : "text-fg-brand")} style={{ left: xOf(m.targetDate, range.start, dw) + dw / 2, top: 24 }}>
                <Icon icon={Diamond} size={14} />
              </span>
            ))}
            {deliverables.map((d) => (
              <span key={d.id} title={`Deliverable: ${d.title} (${formatDate(d.deadline ?? "")})`} className="absolute -translate-x-1/2 text-fg-muted" style={{ left: xOf(d.deadline ?? "", range.start, dw) + dw / 2, top: 28 }}>
                <Icon icon={Package} size={10} />
              </span>
            ))}
            <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
              <defs>
                <marker id="gantt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--text-tertiary)" /></marker>
              </defs>
              {arrows.map((a) => <path key={a.id} d={a.d} fill="none" stroke="var(--text-tertiary)" strokeWidth="1.25" markerEnd="url(#gantt-arrow)" />)}
            </svg>
            {layout.map(({ r, top }) => {
              if (r.kind !== "task") return null;
              const span = taskSpan(r.task);
              if (!span) return null;
              const epicId = r.task.storyId ? data.storyEpic.get(r.task.storyId) : undefined;
              return (
                <GanttBar key={r.task.id} task={r.task} span={span} rangeStart={range.start} dayWidth={dw} top={top + 6} height={ROW - 12}
                  color={(epicId && data.epicById.get(epicId)?.color) || "var(--brand)"} done={data.doneCols.has(r.task.columnId)} overdue={isOverdue(r.task, data.doneCols, today)}
                  editable={canEdit} onOpen={() => onOpenTask(r.task.id)}
                  onCommit={(s) => run((st) => updateTask(st, r.task.id, { startDate: s.start, deadline: s.end }, actor, stamp(today)), `Jadwal ${taskRef(r.task)} diperbarui: ${formatDate(s.start)} – ${formatDate(s.end)}.`)} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
