"use client";

import { useState } from "react";
import { refLabel } from "@/lib/calc/project";
import { sprintReport } from "@/lib/calc/project-charts";
import { countBy, hoursPerPerson, hoursPerWeek } from "@/lib/calc/project-analytics";
import { formatDate, formatDayShort } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { useLookups } from "../../hooks";
import { BarChart } from "../../charts/bar-chart";
import { ChartCard } from "../../charts/chart-card";
import { Card } from "../../ui/display";
import { priorityLabel } from "../task-bits";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

/** Satu seri → tanpa legenda; judul kartu yang menamai seri. */
function SingleBar({ title, subtitle, rows, unit = "" }: { title: string; subtitle?: string; rows: { label: string; value: number }[]; unit?: string }) {
  const series = { key: "v", label: title, color: "var(--chart-1)" };
  return (
    <ChartCard title={title} subtitle={subtitle} series={[series]} table={{ head: ["Kategori", "Nilai"], rows: rows.map((r) => [r.label, `${r.value}${unit}`]) }}>
      {rows.length === 0 ? <p className="py-10 text-center text-xs text-fg-muted">Belum ada data.</p> : (
        <BarChart height={200} categories={rows.map((r) => r.label)} series={[{ ...series, values: rows.map((r) => r.value) }]} yFormat={(v) => `${Math.round(v * 10) / 10}${unit}`} />
      )}
    </ChartCard>
  );
}

export function DistributionCards({ data }: { data: ProjectData }) {
  const { userName } = useLookups();
  const byAssignee = countBy(data.tasks, (t) => (t.assigneeIds.length ? t.assigneeIds : ["none"]));
  const byPriority = countBy(data.tasks, (t) => [t.priority]);
  const byLabel = countBy(data.tasks, (t) => t.labels);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-3">
      <SingleBar title="Task per assignee" rows={[...byAssignee].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k === "none" ? "Tanpa" : userName(k).split(" ")[0], value: v }))} />
      <SingleBar title="Task per prioritas" rows={(["urgent", "high", "medium", "low"] as const).map((p) => ({ label: priorityLabel[p], value: byPriority.get(p) ?? 0 }))} />
      <SingleBar title="Task per label" rows={[...byLabel].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: data.labelById.get(k)?.name ?? k, value: v }))} />
    </div>
  );
}

export function HoursCards() {
  const { state } = useAuthed();
  const { project } = useProject();
  const { userName } = useLookups();
  const entries = state.timesheet.filter((e) => e.projectCode === project.code);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
      <SingleBar title="Jam timesheet per minggu" subtitle={`Kode ${project.code}`} unit=" j" rows={hoursPerWeek(entries).map((w) => ({ label: formatDayShort(w.week).split(", ")[1], value: w.hours }))} />
      <SingleBar title="Jam timesheet per orang" unit=" j" rows={hoursPerPerson(entries).map((p) => ({ label: userName(p.userId).split(" ")[0], value: p.hours }))} />
    </div>
  );
}

/** Laporan sprint: planned, completed, carried over, task tambahan + CR selama sprint. */
export function SprintReportCard({ data }: { data: ProjectData }) {
  const { state } = useAuthed();
  const { project } = useProject();
  const options = data.sprints.filter((s) => s.status !== "planned").reverse();
  const [sprintId, setSprintId] = useState(options[0]?.id ?? "");
  const sprint = options.find((s) => s.id === sprintId);
  if (!sprint) return <Card><p className="text-sm text-fg-muted">Belum ada sprint yang berjalan atau selesai.</p></Card>;
  const r = sprintReport(sprint, data.tasks);
  const crs = state.changeRequests.filter((c) => c.projectId === project.id && c.requestedAt >= sprint.startDate && c.requestedAt <= sprint.endDate);
  const tiles: [string, number][] = [["Direncanakan", r.planned], ["Selesai", r.completed], [sprint.status === "active" ? "Belum selesai" : "Terbawa (carried over)", r.carriedOver], ["Task tambahan", r.added]];
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-medium">Sprint report</h3>
          <p className="text-xs text-fg-subtle">{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)} · {sprint.status === "active" ? "sedang berjalan" : "selesai"}</p>
        </div>
        <select className="h-8 rounded-xxs bg-sunken px-2 text-xs shadow-[inset_0_0_0_1px_var(--border-default)]" value={sprint.id} onChange={(e) => setSprintId(e.target.value)} aria-label="Pilih sprint">
          {options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, v]) => (
          <div key={label} className="rounded-xs bg-sunken p-3">
            <p className="text-xs text-fg-muted">{label}</p>
            <p className="font-serif text-3xl leading-none">{v}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1 text-xs text-fg-muted">CR selama sprint</p>
        {crs.length === 0 ? <p className="text-xs text-fg-subtle">Tidak ada CR.</p> : (
          <ul className="text-sm">{crs.map((c) => <li key={c.id} className="py-0.5"><span className="font-mono text-xs text-fg-brand">{refLabel("CR", c.number)}</span> {c.title} <span className="text-xs text-fg-subtle">· +{c.impactDays} hr</span></li>)}</ul>
        )}
      </div>
    </Card>
  );
}
