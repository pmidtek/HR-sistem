"use client";

import { Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { isScopeCreep, sCurve } from "@/lib/calc/project-charts";
import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { saveBaseline } from "@/store/actions-analytics";
import { stamp } from "@/store/project-core";
import { newId } from "@/store/state";
import { ChartCard } from "../../charts/chart-card";
import { LineChart } from "../../charts/line-chart";
import { Button } from "../../ui/button";
import { Badge, EmptyState } from "../../ui/display";
import { Dialog } from "../../ui/dialog";
import { Input } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

const PLANNED = { key: "planned", label: "Planned", color: "var(--chart-2)", dashed: true };
const ACTUAL = { key: "actual", label: "Actual", color: "var(--chart-1)" };
const REVISED = { key: "revised", label: "Revised (+CR)", color: "var(--chart-3)", dashed: true };

/** S-curve kumulatif per minggu: Planned (baseline), Actual (task selesai), Revised (planned + dampak CR). */
export function SCurveCard({ data }: { data: ProjectData }) {
  const { state, actor, today, run } = useAuthed();
  const { project, canManage } = useProject();
  const baselines = state.baselines.filter((b) => b.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [selected, setSelected] = useState(baselines[0]?.id ?? "");
  const [naming, setNaming] = useState<string | null>(null);
  const baseline = baselines.find((b) => b.id === selected) ?? baselines[0];
  const crs = state.changeRequests.filter((c) => c.projectId === project.id);

  function create() {
    const id = newId("bl");
    if (naming !== null && run((s) => saveBaseline(s, project.id, naming, actor, stamp(today), id), "Baseline disimpan.")) {
      setSelected(id);
      setNaming(null);
    }
  }

  const dialog = naming !== null && (
    <Dialog open onOpenChange={(o) => !o && setNaming(null)} title="Simpan baseline" description="Snapshot rencana saat ini dari deadline semua task."
      footer={<><Button variant="secondary" tone="neutral" onClick={() => setNaming(null)}>Batal</Button><Button disabled={!naming.trim()} onClick={create}>Simpan</Button></>}>
      <Input label="Nama baseline" value={naming} autoFocus onChange={(e) => setNaming(e.target.value)} />
    </Dialog>
  );

  if (!baseline) {
    return (
      <div className="flex flex-col gap-3">
        <EmptyState title="Belum ada baseline" description="Simpan baseline untuk membandingkan rencana dengan realisasi (S-curve)." />
        {canManage && <Button size="small" className="self-center" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setNaming("Rencana awal")}>Buat baseline</Button>}
        {dialog}
      </div>
    );
  }

  const points = sCurve(baseline, data.tasks, crs, today);
  const creep = isScopeCreep(baseline.taskCount, data.tasks.length);
  const todayIndex = points.findIndex((p) => p.date >= today);

  return (
    <>
      <ChartCard
        title="S-Curve"
        subtitle={`Progress kumulatif per minggu · baseline "${baseline.name}" (${formatDate(baseline.createdAt.slice(0, 10))}, ${baseline.taskCount} task)`}
        series={[PLANNED, ACTUAL, REVISED]}
        table={{ head: ["Minggu", "Planned %", "Actual %", "Revised %"], rows: points.map((p) => [formatDate(p.date), p.planned, p.actual ?? "–", p.revised]) }}
        aside={
          <span className="flex flex-wrap items-center gap-2">
            {creep && <Badge tone="warning"><Icon icon={TriangleAlert} size={12} /> Scope creep +{Math.round(((data.tasks.length - baseline.taskCount) / baseline.taskCount) * 100)}%</Badge>}
            {baselines.length > 1 && (
              <select className="h-7 rounded-xxs bg-sunken px-2 text-xs shadow-[inset_0_0_0_1px_var(--border-default)]" value={baseline.id} onChange={(e) => setSelected(e.target.value)} aria-label="Pilih baseline">
                {baselines.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {canManage && <Button size="small" variant="ghost" tone="neutral" onClick={() => setNaming(`Baseline ${formatDate(today)}`)}>Simpan baseline</Button>}
          </span>
        }
      >
        <LineChart
          height={260}
          x={points.map((p) => formatDate(p.date).slice(0, 6))}
          yMax={100}
          todayIndex={todayIndex}
          yFormat={(v) => `${Math.round(v)}%`}
          series={[{ ...PLANNED, values: points.map((p) => p.planned) }, { ...ACTUAL, values: points.map((p) => p.actual) }, { ...REVISED, values: points.map((p) => p.revised) }]}
        />
      </ChartCard>
      {dialog}
    </>
  );
}
