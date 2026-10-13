"use client";

import { daysLeft, isOverdue, progressOf } from "@/lib/calc/project";
import { entryMinutes } from "@/lib/calc/timesheet";
import { cn } from "@/lib/cn";
import { formatDate, formatHours } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { Card } from "../../ui/display";
import { CountUp, GrowBar, Stagger, StaggerItem } from "../../ui/motion";
import type { ProjectData } from "../use-project-data";
import { useProject } from "../workspace/context";

function Tile({ label, children, sub, danger, index }: { label: string; children: React.ReactNode; sub?: React.ReactNode; danger?: boolean; index: number }) {
  return (
    <StaggerItem index={index} className="flex">
      <Card padding="sm" className={cn("flex w-full flex-col gap-1", danger && "shadow-[inset_0_0_0_1px_var(--danger)]")}>
        <span className="text-xs text-fg-muted">{label}</span>
        <span className={cn("font-serif text-3xl leading-none", danger ? "text-fg-danger" : "text-fg")}>{children}</span>
        {sub && <span className="text-xs text-fg-subtle">{sub}</span>}
      </Card>
    </StaggerItem>
  );
}

/** Strip status (Overview a): kondisi project dalam sekali lihat. */
export function StatusStrip({ data }: { data: ProjectData }) {
  const { state, today } = useAuthed();
  const { project } = useProject();
  const prog = progressOf(data.tasks, data.doneCols);
  const open = data.tasks.filter((t) => !data.doneCols.has(t.columnId));
  const overdue = open.filter((t) => isOverdue(t, data.doneCols, today)).length;
  const unassigned = open.filter((t) => t.assigneeIds.length === 0).length;
  const nextMilestone = state.milestones
    .filter((m) => m.projectId === project.id && !m.completedAt)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
  const left = daysLeft(project.targetDate, today);
  const minutes = state.timesheet.filter((e) => e.projectCode === project.code).reduce((s, e) => s + entryMinutes(e), 0);

  return (
    <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile index={0} label="Progress" sub={<span className="mt-1 block h-1.5 overflow-hidden rounded-[4px] bg-hover"><GrowBar ratio={prog.percent / 100} className="h-full w-full rounded-[4px] bg-brand" /></span>}>
        <CountUp value={prog.percent} format={(n) => `${n}%`} />
      </Tile>
      <Tile index={1} label="Berjalan" sub="task belum selesai"><CountUp value={open.length} /></Tile>
      <Tile index={2} label="Selesai" sub={`dari ${prog.total} task`}><CountUp value={prog.done} /></Tile>
      <Tile index={3} label="Terlambat" sub="lewat deadline" danger={overdue > 0}><CountUp value={overdue} /></Tile>
      <Tile index={4} label="Tanpa assignee" sub="task terbuka"><CountUp value={unassigned} /></Tile>
      <Tile index={5} label="Milestone berikut" sub={nextMilestone ? formatDate(nextMilestone.targetDate) : undefined}>
        <span className="block truncate font-sans text-base leading-snug">{nextMilestone?.name ?? "Tidak ada"}</span>
      </Tile>
      <Tile index={6} label="Target selesai" danger={left < 0} sub={left < 0 ? `lewat ${-left} hari` : left === 0 ? "hari ini" : `${left} hari lagi`}>
        <span className="text-xl">{formatDate(project.targetDate)}</span>
      </Tile>
      <Tile index={7} label="Jam tercatat" sub="dari timesheet"><CountUp value={Math.round(minutes / 60)} format={(n) => `${formatHours(n * 60)} j`} /></Tile>
    </Stagger>
  );
}
