"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isOverdue, taskRef } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { useLookups } from "../../hooks";
import { Table, Td, Th, Tr } from "../../ui/table";
import { AvatarStack, PriorityBadge } from "../task-bits";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";
import { OverviewCard } from "./overview-sections";

const sel = "h-8 rounded-xxs bg-sunken px-2 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border-default)]";

/** f. Register semua task lintas board, dengan filter board, status (nama kolom), assignee. */
export function TaskRegister({ data }: { data: ProjectData }) {
  const { today } = useAuthed();
  const { base } = useProject();
  const { userName } = useLookups();
  const router = useRouter();
  const [boardId, setBoardId] = useState("");
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const statusNames = [...new Set(data.columns.filter((c) => !boardId || c.boardId === boardId).map((c) => c.name))];

  const rows = data.tasks
    .filter((t) => (!boardId || t.boardId === boardId) && (!status || data.columnById.get(t.columnId)?.name === status) && (!assignee || t.assigneeIds.includes(assignee)))
    .sort((a, b) => a.number - b.number);

  return (
    <OverviewCard
      title="Register task"
      aside={
        <span className="flex flex-wrap gap-2">
          <select className={sel} value={boardId} onChange={(e) => { setBoardId(e.target.value); setStatus(""); }} aria-label="Filter board">
            <option value="">Semua board</option>
            {data.boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
            <option value="">Semua status</option>
            {statusNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select className={sel} value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Filter assignee">
            <option value="">Semua assignee</option>
            {data.memberOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </span>
      }
    >
      <div className="max-h-[420px] overflow-y-auto">
        <Table>
          <thead><tr><Th>ID</Th><Th>Judul</Th><Th>Board</Th><Th>Status</Th><Th>Assignee</Th><Th>Prioritas</Th><Th>Deadline</Th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <Tr key={t.id} className="cursor-pointer" onClick={() => router.push(`${base}/board?board=${t.boardId}&task=${t.id}`)}>
                <Td className="font-mono text-xs text-fg-subtle">{taskRef(t)}</Td>
                <Td className="min-w-48">{t.title}</Td>
                <Td className="text-xs text-fg-muted">{data.boards.find((b) => b.id === t.boardId)?.name}</Td>
                <Td className="text-xs whitespace-nowrap text-fg-muted">{data.columnById.get(t.columnId)?.name}</Td>
                <Td><AvatarStack names={t.assigneeIds.map((id) => userName(id))} /></Td>
                <Td><PriorityBadge priority={t.priority} /></Td>
                <Td className={cn("text-xs whitespace-nowrap", isOverdue(t, data.doneCols, today) ? "text-fg-danger" : "text-fg-muted")}>{t.deadline ? formatDate(t.deadline) : "–"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      <p className="text-xs text-fg-subtle">{rows.length} task</p>
    </OverviewCard>
  );
}
