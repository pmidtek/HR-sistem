"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { velocity } from "@/lib/calc/project-charts";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { ActiveSprintCard } from "@/components/projects/sprints/active-sprint-card";
import { CompleteSprintDialog, SprintFormDialog, SprintTasksDialog } from "@/components/projects/sprints/sprint-dialogs";
import { SprintList, type SprintAction } from "@/components/projects/sprints/sprint-list";
import { useProjectData } from "@/components/projects/use-project-data";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";
import { CountUpScope } from "@/components/ui/motion";

const PLANNED = { key: "planned", label: "Direncanakan", color: "var(--chart-2)" };
const DONE = { key: "completed", label: "Selesai", color: "var(--chart-1)" };

export default function SprintsPage() {
  const { project, canManage } = useProject();
  const data = useProjectData();
  const [action, setAction] = useState<SprintAction | { kind: "new" } | null>(null);
  const active = data.sprints.filter((s) => s.status === "active");
  const bars = velocity(data.sprints, data.tasks);
  const close = () => setAction(null);

  return (
    <CountUpScope id={`sprints-${project.id}`}>
      <div className="flex flex-col gap-6">
        <SectionHeader
          title="Sprints"
          description="Satu sprint aktif per tim. Saat sprint dimulai, daftar task-nya disimpan sebagai rencana."
          actions={canManage && <Button size="small" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setAction({ kind: "new" })}>Sprint baru</Button>}
        />
        {active.map((s) => <ActiveSprintCard key={s.id} sprint={s} data={data} />)}
        {data.sprints.length === 0 ? (
          <EmptyState title="Belum ada sprint" description="Buat sprint untuk merencanakan pekerjaan 1–2 minggu ke depan." />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <SprintList data={data} onAction={setAction} />
            <ChartCard
              title="Velocity"
              subtitle="Task direncanakan vs selesai per sprint"
              series={[PLANNED, DONE]}
              table={{ head: ["Sprint", "Direncanakan", "Selesai"], rows: bars.map((b) => [b.name, b.planned, b.completed]) }}
            >
              {bars.length === 0 ? <p className="py-10 text-center text-xs text-fg-muted">Belum ada sprint yang selesai.</p> : (
                <BarChart categories={bars.map((b) => b.name)} series={[{ ...PLANNED, values: bars.map((b) => b.planned) }, { ...DONE, values: bars.map((b) => b.completed) }]} />
              )}
            </ChartCard>
          </div>
        )}
        {action?.kind === "new" && <SprintFormDialog sprint={null} onClose={close} />}
        {action?.kind === "edit" && <SprintFormDialog sprint={action.sprint} onClose={close} />}
        {action?.kind === "tasks" && <SprintTasksDialog sprint={action.sprint} data={data} onClose={close} />}
        {action?.kind === "complete" && <CompleteSprintDialog sprint={action.sprint} data={data} onClose={close} />}
      </div>
    </CountUpScope>
  );
}
