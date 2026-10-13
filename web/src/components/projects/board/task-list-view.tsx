"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { isOverdue, taskRef } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Task } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { updateTask, type TaskPatch } from "@/store/actions-tasks";
import { stamp } from "@/store/project-core";
import { useLookups } from "../../hooks";
import { EmptyState } from "../../ui/display";
import { Icon } from "../../ui/icon";
import { MultiSelect } from "../../ui/multi-select";
import { Table, Td, Th, Tr } from "../../ui/table";
import { AvatarStack, LabelChip, PriorityBadge, priorityRank } from "../task-bits";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

type SortKey = "number" | "title" | "status" | "assignee" | "priority" | "deadline" | "epic";
type Sort = { key: SortKey; asc: boolean };

const headLabel: Record<SortKey, string> = { number: "ID", title: "Judul", status: "Status", assignee: "Assignee", priority: "Prioritas", deadline: "Deadline", epic: "Epic" };

function Head({ k, sort, onSort, children }: { k: SortKey; sort: Sort; onSort: (s: Sort) => void; children: string }) {
  return (
    <Th>
      <button type="button" onClick={() => onSort({ key: k, asc: sort.key === k ? !sort.asc : true })} className="inline-flex items-center gap-1 uppercase hover:text-fg">
        {children}
        {sort.key === k && <Icon icon={sort.asc ? ArrowUp : ArrowDown} size={10} />}
      </button>
    </Th>
  );
}

/** Tabel task: kolom bisa diurutkan, status/assignee/label bisa diedit langsung di sel. */
export function TaskListView({ tasks, data, onOpenTask }: { tasks: Task[]; data: ProjectData; onOpenTask: (id: string) => void }) {
  const { actor, today, run } = useAuthed();
  const { canEdit } = useProject();
  const { userName } = useLookups();
  const [sort, setSort] = useState<Sort>({ key: "number", asc: true });
  const epicOf = (t: Task) => (t.storyId ? data.epicById.get(data.storyEpic.get(t.storyId) ?? "") : undefined);
  const patch = (id: string, p: TaskPatch) => run((s) => updateTask(s, id, p, actor, stamp(today)));

  const keyOf: Record<SortKey, (t: Task) => string | number> = {
    number: (t) => t.number,
    title: (t) => t.title.toLowerCase(),
    status: (t) => data.columnById.get(t.columnId)?.order ?? 0,
    assignee: (t) => userName(t.assigneeIds[0] ?? null),
    priority: (t) => priorityRank[t.priority],
    deadline: (t) => t.deadline ?? "9999",
    epic: (t) => epicOf(t)?.title ?? "~",
  };
  const sorted = [...tasks].sort((a, b) => {
    const x = keyOf[sort.key](a);
    const y = keyOf[sort.key](b);
    return (x < y ? -1 : x > y ? 1 : a.number - b.number) * (sort.asc ? 1 : -1);
  });

  if (tasks.length === 0) return <EmptyState title="Tidak ada task" description="Ubah filter atau buat task baru." />;

  return (
    <Table>
      <thead>
        <tr>
          {(["number", "title", "status", "assignee", "priority", "deadline"] as const).map((k) => (
            <Head key={k} k={k} sort={sort} onSort={setSort}>{headLabel[k]}</Head>
          ))}
          <Th>Label</Th>
          <Head k="epic" sort={sort} onSort={setSort}>Epic</Head>
        </tr>
      </thead>
      <tbody>
        {sorted.map((t) => {
          const col = data.columnById.get(t.columnId);
          const boardCols = data.columns.filter((c) => c.boardId === t.boardId);
          return (
            <Tr key={t.id}>
              <Td className="font-mono text-xs text-fg-subtle">{taskRef(t)}</Td>
              <Td className="min-w-56">
                <button type="button" onClick={() => onOpenTask(t.id)} className="text-left hover:text-fg-brand">{t.title}</button>
                {t.blocked && <span className="ml-2 text-xs text-fg-danger">blocked</span>}
              </Td>
              <Td>
                {canEdit ? (
                  <select value={t.columnId} onChange={(e) => patch(t.id, { columnId: e.target.value })} className="h-7 rounded-xxs bg-sunken px-2 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border-default)]" aria-label="Status">
                    {boardCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : <span className="text-xs text-fg-muted">{col?.name}</span>}
              </Td>
              <Td>
                <MultiSelect options={data.memberOptions} value={t.assigneeIds} onChange={(v) => patch(t.id, { assigneeIds: v })} disabled={!canEdit}>
                  <button type="button" className={cn("flex min-h-7 items-center rounded-xxs px-1", canEdit && "hover:bg-hover")}>
                    {t.assigneeIds.length ? <AvatarStack names={t.assigneeIds.map((id) => userName(id))} /> : <span className="text-xs text-fg-subtle">–</span>}
                  </button>
                </MultiSelect>
              </Td>
              <Td><PriorityBadge priority={t.priority} /></Td>
              <Td className={cn("text-xs whitespace-nowrap", isOverdue(t, data.doneCols, today) ? "text-fg-danger" : "text-fg-muted")}>{t.deadline ? formatDate(t.deadline) : "–"}</Td>
              <Td>
                <MultiSelect options={data.labelOptions} value={t.labels} onChange={(v) => patch(t.id, { labels: v })} disabled={!canEdit}>
                  <button type="button" className={cn("flex min-h-7 flex-wrap items-center gap-1 rounded-xxs px-1", canEdit && "hover:bg-hover")}>
                    {t.labels.length ? t.labels.map((id) => { const l = data.labelById.get(id); return l ? <LabelChip key={id} label={l} /> : null; }) : <span className="text-xs text-fg-subtle">–</span>}
                  </button>
                </MultiSelect>
              </Td>
              <Td className="text-xs whitespace-nowrap text-fg-muted">{epicOf(t)?.title ?? "–"}</Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
