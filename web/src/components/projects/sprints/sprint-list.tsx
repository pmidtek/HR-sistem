"use client";

import { CheckCheck, ListChecks, Pencil, Play, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Sprint, SprintStatus } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deleteSprint, startSprint } from "@/store/actions-sprints";
import { stamp } from "@/store/project-core";
import { useLookups } from "../../hooks";
import { Badge, type BadgeTone } from "../../ui/display";
import { Menu } from "../../ui/menu";
import { Stagger, StaggerItem } from "../../ui/motion";
import { rowClass, Table, Td, Th } from "../../ui/table";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

const statusBadge: Record<SprintStatus, [string, BadgeTone]> = { planned: ["Direncanakan", "neutral"], active: ["Aktif", "brand"], completed: ["Selesai", "success"] };

export type SprintAction = { kind: "edit" | "tasks" | "complete"; sprint: Sprint };

/** Daftar sprint per tim dengan aksi Atur task / Mulai / Selesaikan / Edit / Hapus. */
export function SprintList({ data, onAction }: { data: ProjectData; onAction: (a: SprintAction) => void }) {
  const { actor, today, run } = useAuthed();
  const { canManage } = useProject();
  const { teamName } = useLookups();
  const teams = [...new Set(data.sprints.map((s) => s.teamId))];

  return (
    <div className="flex flex-col gap-5">
      {teams.map((teamId) => (
        <section key={teamId ?? "none"} className="flex flex-col gap-2">
          <h3 className="font-mono text-[11px] tracking-[0.08em] text-fg-subtle uppercase">{teamId ? teamName(teamId) : "Tanpa tim"}</h3>
          <Table>
            <thead><tr><Th>Sprint</Th><Th>Status</Th><Th>Tanggal</Th><Th className="text-right">Task</Th><Th /></tr></thead>
            <Stagger as="tbody">
              {data.sprints.filter((s) => s.teamId === teamId).reverse().map((s, i) => {
                const tasks = data.tasks.filter((t) => t.sprintId === s.id || (s.status !== "planned" && s.plannedTaskIds.includes(t.id)));
                const done = tasks.filter((t) => data.doneCols.has(t.columnId)).length;
                const [label, tone] = statusBadge[s.status];
                return (
                  <StaggerItem as="tr" key={s.id} index={i} className={rowClass}>
                    <Td>
                      <p className="text-sm">{s.name}</p>
                      {s.goal && <p className="max-w-md truncate text-xs text-fg-subtle">{s.goal}</p>}
                    </Td>
                    <Td><Badge tone={tone} dot>{label}</Badge></Td>
                    <Td className="text-xs whitespace-nowrap text-fg-muted">{formatDate(s.startDate)} – {formatDate(s.endDate)}</Td>
                    <Td className="text-right font-mono text-xs">{done}/{tasks.length}</Td>
                    <Td className="text-right">
                      {canManage && (
                        <Menu items={[
                          { label: "Atur task", icon: ListChecks, onSelect: () => onAction({ kind: "tasks", sprint: s }), hidden: s.status === "completed" },
                          { label: "Mulai sprint", icon: Play, onSelect: () => run((st) => startSprint(st, s.id, actor, stamp(today)), `${s.name} dimulai.`), hidden: s.status !== "planned" },
                          { label: "Selesaikan", icon: CheckCheck, onSelect: () => onAction({ kind: "complete", sprint: s }), hidden: s.status !== "active" },
                          { label: "Edit", icon: Pencil, onSelect: () => onAction({ kind: "edit", sprint: s }) },
                          { label: "Hapus", icon: Trash2, danger: true, onSelect: () => run((st) => deleteSprint(st, s.id, actor, stamp(today)), "Sprint dihapus."), hidden: s.status !== "planned" },
                        ]} />
                      )}
                    </Td>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </Table>
        </section>
      ))}
    </div>
  );
}
