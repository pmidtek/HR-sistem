"use client";

import { CheckCircle2, Diamond, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { daysLeft, milestoneState, progressOf, taskRef, type MilestoneState } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Milestone } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deleteMilestone, toggleMilestoneDone } from "@/store/actions-plan";
import { stamp } from "@/store/project-core";
import { MilestoneDialog } from "@/components/projects/milestones/milestone-dialog";
import { useProjectData } from "@/components/projects/use-project-data";
import { useQueryParam } from "@/components/projects/use-query-param";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, type BadgeTone } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";
import { Menu } from "@/components/ui/menu";
import { GrowBar, Stagger, StaggerItem } from "@/components/ui/motion";

const stateLabel: Record<MilestoneState, [string, BadgeTone, string]> = {
  done: ["Selesai", "success", "text-fg-success"],
  late: ["Terlambat", "danger", "text-fg-danger"],
  open: ["Belum", "neutral", "text-fg-brand"],
};

export default function MilestonesPage() {
  const { state, actor, today, run } = useAuthed();
  const { project, base, canManage } = useProject();
  const data = useProjectData();
  const [newParam, setNewParam] = useQueryParam("new");
  const [editing, setEditing] = useState<Milestone | null>(null);
  const milestones = state.milestones.filter((m) => m.projectId === project.id).sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const dialogOpen = editing !== null || (newParam === "1" && canManage);
  const at = () => stamp(today);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Milestones"
        description="Titik penting project. Otomatis muncul di Agenda Overview dan Gantt."
        actions={canManage && <Button size="small" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setNewParam("1")}>Milestone baru</Button>}
      />
      {milestones.length === 0 ? (
        <EmptyState title="Belum ada milestone" />
      ) : (
        <Stagger as="ul" className="relative flex flex-col gap-4 pl-8 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-line-strong">
          {milestones.map((m, i) => {
            const st = milestoneState(m, today);
            const [label, tone, color] = stateLabel[st];
            const tasks = m.taskIds.map((id) => data.taskById.get(id)).filter((t) => t !== undefined);
            const prog = progressOf(tasks, data.doneCols);
            const left = daysLeft(m.targetDate, today);
            return (
              <StaggerItem as="li" key={m.id} index={i} className="relative">
                <span className={cn("absolute top-5 -left-8 flex size-6 items-center justify-center rounded-full bg-canvas", color)}>
                  <Icon icon={st === "done" ? CheckCircle2 : Diamond} size={16} />
                </span>
                <Card className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-medium">{m.name}</p>
                      <p className="text-xs text-fg-muted">
                        Target {formatDate(m.targetDate)}
                        {st === "open" && ` · ${left === 0 ? "hari ini" : `${left} hari lagi`}`}
                        {st === "late" && ` · lewat ${-left} hari`}
                        {m.completedAt && ` · tercapai ${formatDate(m.completedAt.slice(0, 10))}`}
                      </p>
                    </div>
                    <Badge tone={tone} dot>{label}</Badge>
                    {canManage && (
                      <Menu items={[
                        { label: "Edit & tautkan task", icon: Pencil, onSelect: () => setEditing(m) },
                        { label: m.completedAt ? "Buka lagi" : "Tandai selesai", icon: m.completedAt ? RotateCcw : CheckCircle2, onSelect: () => run((s) => toggleMilestoneDone(s, m.id, actor, at()), m.completedAt ? "Milestone dibuka lagi." : "Milestone ditandai selesai.") },
                        { label: "Hapus", icon: Trash2, danger: true, onSelect: () => run((s) => deleteMilestone(s, m.id, actor, at()), "Milestone dihapus.") },
                      ]} />
                    )}
                  </div>
                  {m.description && <p className="text-sm text-fg-muted">{m.description}</p>}
                  <div className="flex items-center gap-3">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-[4px] bg-hover"><GrowBar ratio={prog.percent / 100} className="h-full w-full rounded-[4px] bg-brand" /></span>
                    <span className="font-mono text-xs text-fg-muted">{prog.done}/{prog.total} task · {prog.percent}%</span>
                  </div>
                  {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tasks.map((t) => (
                        <Link key={t.id} href={`${base}/board?board=${t.boardId}&task=${t.id}`} className={cn("rounded-xxs bg-hover px-2 py-0.5 text-xs hover:text-fg-brand", data.doneCols.has(t.columnId) && "text-fg-subtle line-through")}>
                          {taskRef(t)} {t.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
      {dialogOpen && <MilestoneDialog milestone={editing} data={data} onClose={() => { setEditing(null); if (newParam) setNewParam(null); }} />}
    </div>
  );
}
