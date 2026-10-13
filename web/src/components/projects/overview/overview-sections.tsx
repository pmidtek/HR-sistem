"use client";

import { Ban, CalendarClock, Diamond, Package, Timer } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { agenda, attentionTasks, daysOverdue, progressOf, taskRef, workload, type AgendaItem, type AgendaKind } from "@/lib/calc/project";
import { formatDayShort } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { useLookups } from "../../hooks";
import { Button } from "../../ui/button";
import { Avatar, Card } from "../../ui/display";
import { Icon } from "../../ui/icon";
import { GrowBar } from "../../ui/motion";
import { Table, Td, Th, Tr } from "../../ui/table";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

export function OverviewCard({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-medium">{title}</h3>
        {aside}
      </div>
      {children}
    </Card>
  );
}

/** b. Task terlambat + blocked, urut paling parah. */
export function AttentionList({ data }: { data: ProjectData }) {
  const { today } = useAuthed();
  const { base } = useProject();
  const { userName } = useLookups();
  const [all, setAll] = useState(false);
  const list = attentionTasks(data.tasks, data.doneCols, today);
  return (
    <OverviewCard title="Perlu perhatian" aside={<span className="font-mono text-xs text-fg-muted">{list.length}</span>}>
      {list.length === 0 && <p className="text-xs text-fg-muted">Tidak ada task terlambat atau blocked.</p>}
      <ul className="flex flex-col divide-y divide-[var(--border-default)]">
        {(all ? list : list.slice(0, 5)).map((t) => {
          const late = daysOverdue(t, today);
          return (
            <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-10 shrink-0 font-mono text-xs text-fg-subtle">{taskRef(t)}</span>
              <Link href={`${base}/board?board=${t.boardId}&task=${t.id}`} className="min-w-0 flex-1 truncate hover:text-fg-brand">{t.title}</Link>
              {t.blocked && <span className="inline-flex items-center gap-1 text-xs text-fg-danger"><Icon icon={Ban} size={12} />blocked</span>}
              {late > 0 && <span className="text-xs text-fg-danger">+{late} hr</span>}
              <span className="hidden text-xs text-fg-muted sm:inline">{userName(t.assigneeIds[0] ?? null)}</span>
            </li>
          );
        })}
      </ul>
      {list.length > 5 && <Button variant="ghost" tone="neutral" size="small" onClick={() => setAll((x) => !x)}>{all ? "Tampilkan lebih sedikit" : `Tampilkan semua (${list.length})`}</Button>}
    </OverviewCard>
  );
}

/** c. Progress per board. */
export function BoardProgress({ data }: { data: ProjectData }) {
  const { base } = useProject();
  return (
    <OverviewCard title="Progress per board">
      <div className="flex flex-col gap-3">
        {data.boards.map((b) => {
          const p = progressOf(data.tasks.filter((t) => t.boardId === b.id), data.doneCols);
          return (
            <Link key={b.id} href={`${base}/board?board=${b.id}`} className="group grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3">
              <span className="truncate text-sm text-fg-muted group-hover:text-fg">{b.name}</span>
              <span className="h-2 overflow-hidden rounded-[4px] bg-hover"><GrowBar ratio={p.percent / 100} className="h-full w-full rounded-[4px] bg-brand" /></span>
              <span className="font-mono text-xs text-fg">{p.done}/{p.total} task</span>
            </Link>
          );
        })}
      </div>
    </OverviewCard>
  );
}

const agendaIcon: Record<AgendaKind, typeof Diamond> = { task: CalendarClock, milestone: Diamond, deliverable: Package, sprint: Timer };

/** d. Agenda 14 hari: deadline task, milestone, deliverable, akhir sprint. */
export function AgendaCard({ data }: { data: ProjectData }) {
  const { state, today } = useAuthed();
  const { project } = useProject();
  const items: AgendaItem[] = [
    ...data.tasks.filter((t) => t.deadline && !data.doneCols.has(t.columnId)).map((t) => ({ date: t.deadline ?? "", kind: "task" as const, label: t.title, ref: taskRef(t) })),
    ...state.milestones.filter((m) => m.projectId === project.id && !m.completedAt).map((m) => ({ date: m.targetDate, kind: "milestone" as const, label: m.name, ref: null })),
    ...state.deliverables.filter((d) => d.projectId === project.id && d.deadline && d.status !== "sent").map((d) => ({ date: d.deadline ?? "", kind: "deliverable" as const, label: d.title, ref: null })),
    ...data.sprints.filter((s) => s.status !== "completed").map((s) => ({ date: s.endDate, kind: "sprint" as const, label: `Akhir ${s.name}`, ref: null })),
  ];
  const groups = agenda(items, today);
  return (
    <OverviewCard title="Agenda 14 hari">
      {groups.length === 0 && <p className="text-xs text-fg-muted">Tidak ada jadwal dalam 14 hari ke depan.</p>}
      <ol className="flex flex-col gap-3">
        {groups.map((g) => (
          <li key={g.date} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
            <span className={g.date === today ? "text-xs font-medium text-fg-brand" : "text-xs text-fg-muted"}>{g.date === today ? "Hari ini" : formatDayShort(g.date)}</span>
            <ul className="flex flex-col gap-1">
              {g.items.map((i, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <Icon icon={agendaIcon[i.kind]} size={13} className="text-fg-subtle" />
                  {i.ref && <span className="font-mono text-[11px] text-fg-subtle">{i.ref}</span>}
                  <span className="truncate">{i.label}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </OverviewCard>
  );
}

/** e. Beban tim per anggota + baris tanpa assignee. */
export function WorkloadCard({ data }: { data: ProjectData }) {
  const { today } = useAuthed();
  const { project } = useProject();
  const { userName } = useLookups();
  const rows = workload(data.tasks, data.columns, project.memberIds, today);
  return (
    <OverviewCard title="Beban tim">
      <Table>
        <thead><tr><Th>Anggota</Th><Th className="text-right">Terbuka</Th><Th className="text-right">Berjalan</Th><Th className="text-right">Terlambat</Th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r.userId ?? "none"}>
              <Td>
                {r.userId ? (
                  <span className="flex items-center gap-2"><Avatar name={userName(r.userId)} size="small" />{userName(r.userId)}</span>
                ) : <span className="text-fg-muted italic">Tanpa assignee</span>}
              </Td>
              <Td className="text-right font-mono text-xs">{r.open}</Td>
              <Td className="text-right font-mono text-xs">{r.inProgress}</Td>
              <Td className={r.overdue > 0 ? "text-right font-mono text-xs text-fg-danger" : "text-right font-mono text-xs"}>{r.overdue}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </OverviewCard>
  );
}

