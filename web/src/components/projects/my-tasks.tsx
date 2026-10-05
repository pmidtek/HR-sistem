"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { EmptyState } from "../ui/display";
import { Table, Td, Th, Tr } from "../ui/table";
import { PriorityBadge } from "./task-bits";

/** Task yang di-assign ke user, lintas project. */
export function MyTasks() {
  const { state, user, today } = useAuthed();
  const doneCols = new Set(state.boardColumns.filter((c) => c.isDone).map((c) => c.id));
  const tasks = state.tasks
    .filter((t) => t.assigneeId === user.id && !doneCols.has(t.columnId))
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  if (tasks.length === 0) return <EmptyState title="Tidak ada task aktif" description="Task yang di-assign ke Anda akan muncul di sini." />;
  return (
    <Table>
      <thead><tr><Th>Task</Th><Th>Project</Th><Th>Kolom</Th><Th>Prioritas</Th><Th>Deadline</Th></tr></thead>
      <tbody>
        {tasks.map((t) => {
          const p = state.projects.find((x) => x.id === t.projectId);
          const col = state.boardColumns.find((c) => c.id === t.columnId);
          return (
            <Tr key={t.id}>
              <Td><Link href={`/projects/${t.projectId}`} className="hover:text-fg-brand">{t.title}</Link></Td>
              <Td className="font-mono text-xs text-fg-brand">{p?.code}</Td>
              <Td className="text-fg-muted">{col?.name}</Td>
              <Td><PriorityBadge priority={t.priority} /></Td>
              <Td className={t.deadline && t.deadline < today ? "text-fg-danger" : "text-fg-muted"}>{t.deadline ? formatDate(t.deadline) : "-"}</Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
