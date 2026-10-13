"use client";

import { burndown } from "@/lib/calc/project-charts";
import { daysLeft, progressOf } from "@/lib/calc/project";
import { formatDate, formatDayShort } from "@/lib/format";
import type { Sprint } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { useLookups } from "../../hooks";
import { ChartCard } from "../../charts/chart-card";
import { LineChart } from "../../charts/line-chart";
import { Badge, Card } from "../../ui/display";
import { CountUp, GrowBar } from "../../ui/motion";
import type { ProjectData } from "../use-project-data";

const IDEAL = { key: "ideal", label: "Ideal", color: "var(--chart-2)", dashed: true };
const ACTUAL = { key: "actual", label: "Sisa task aktual", color: "var(--chart-1)" };

/** Sprint aktif: tujuan, sisa hari, progress task rencana, dan burndown. */
export function ActiveSprintCard({ sprint, data }: { sprint: Sprint; data: ProjectData }) {
  const { today } = useAuthed();
  const { teamName } = useLookups();
  const inSprint = data.tasks.filter((t) => t.sprintId === sprint.id || sprint.plannedTaskIds.includes(t.id));
  const prog = progressOf(inSprint, data.doneCols);
  const left = daysLeft(sprint.endDate, today);
  const points = burndown(sprint, data.tasks, today);
  const x = points.map((p) => formatDayShort(p.date).split(", ")[1]);
  const todayIndex = points.findIndex((p) => p.date === today);

  return (
    <Card padding="lg" className="grid gap-6 shadow-[inset_0_0_0_1px_var(--brand),var(--glass-highlight)] lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand" dot>Aktif</Badge>
            {sprint.teamId && <span className="text-xs text-fg-muted">{teamName(sprint.teamId)}</span>}
          </div>
          <p className="mt-2 font-display text-xl font-medium">{sprint.name}</p>
          <p className="mt-1 text-sm text-fg-muted">{sprint.goal || "Tanpa tujuan tertulis."}</p>
          <p className="mt-2 font-mono text-xs text-fg-subtle">{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-fg-muted">Sisa hari</p>
            <p className="font-serif text-4xl leading-none"><CountUp value={Math.max(0, left)} /></p>
            {left < 0 && <p className="text-xs text-fg-danger">lewat {-left} hari</p>}
          </div>
          <div>
            <p className="text-xs text-fg-muted">Progress</p>
            <p className="font-serif text-4xl leading-none"><CountUp value={prog.percent} format={(n) => `${n}%`} /></p>
            <p className="text-xs text-fg-subtle">{prog.done}/{prog.total} task</p>
          </div>
        </div>
        <span className="h-1.5 overflow-hidden rounded-[4px] bg-hover"><GrowBar ratio={prog.percent / 100} className="h-full w-full rounded-[4px] bg-brand" /></span>
      </div>
      <ChartCard
        title="Burndown"
        subtitle="Sisa task rencana per hari"
        series={[IDEAL, ACTUAL]}
        table={{ head: ["Tanggal", "Ideal", "Aktual"], rows: points.map((p) => [formatDate(p.date), p.ideal, p.actual ?? "–"]) }}
      >
        <LineChart
          x={x}
          todayIndex={todayIndex}
          series={[{ ...IDEAL, values: points.map((p) => p.ideal) }, { ...ACTUAL, values: points.map((p) => p.actual) }]}
          yFormat={(v) => String(Math.round(v))}
        />
      </ChartCard>
    </Card>
  );
}
