"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { use, useState } from "react";
import { formatDate } from "@/lib/format";
import { canEditProject, canSeeProject, projectProgress } from "@/lib/projects";
import type { ProjectStatus } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { moveTask, setProjectStatus } from "@/store/actions-business";
import { useLookups } from "@/components/hooks";
import { TaskBoard } from "@/components/projects/task-board";
import { TaskDialog, type TaskDraft } from "@/components/projects/task-dialog";
import { PriorityBadge } from "@/components/projects/task-bits";
import { PageHeader } from "@/components/shell/page-header";
import { projectStatusLabel } from "@/components/status-badge";
import { buttonClass } from "@/components/ui/button";
import { Avatar, Card, EmptyState, Stat } from "@/components/ui/display";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";

export default function ProjectDetailPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = use(params);
  const { state, user, today, run } = useAuthed();
  const { teamName, userName } = useLookups();
  const [view, setView] = useState<"board" | "list">("board");
  const [task, setTask] = useState<TaskDraft | null>(null);
  const project = state.projects.find((p) => p.id === id);

  if (!project || !canSeeProject(user, project)) return <EmptyState title="Project tidak ditemukan" description="Atau Anda bukan anggota project ini." />;

  const editable = canEditProject(user, project);
  const columns = state.boardColumns.filter((c) => c.projectId === id).sort((a, b) => a.order - b.order);
  const tasks = state.tasks.filter((t) => t.projectId === id);
  const progress = projectProgress(id, state.tasks, state.boardColumns);
  const opp = state.opportunities.find((o) => o.id === project.opportunityId);
  const newTask = (columnId: string): TaskDraft => ({ projectId: id, columnId, title: "", assigneeId: null, priority: "medium", deadline: null, labels: [], checklist: [] });

  return (
    <>
      <Link href="/projects" className={buttonClass({ variant: "ghost", tone: "neutral", size: "small" }) + " mb-4 -ml-3"}>
        <Icon icon={ArrowLeft} size={14} /> Semua project
      </Link>
      <PageHeader
        title={project.name}
        description={`${project.code} · ${project.teamIds.map(teamName).join(", ")}${opp ? ` · dari ${opp.code}` : ""}`}
        actions={(editable || user.role === "stakeholder") && (
          <Select value={project.status} onChange={(e) => run((s) => setProjectStatus(s, id, e.target.value as ProjectStatus), "Status project diperbarui.")} options={Object.entries(projectStatusLabel).map(([value, label]) => ({ value, label }))} />
        )}
      />

      <Card padding="lg" className="mb-6 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Progress" value={`${progress}%`} sub={`${tasks.length} task`} />
        <Stat label="Mulai" value={<span className="text-2xl">{formatDate(project.startDate)}</span>} />
        <Stat label="Target selesai" value={<span className={project.targetDate < today && project.status !== "done" ? "text-2xl text-fg-danger" : "text-2xl"}>{formatDate(project.targetDate)}</span>} />
        <div className="flex flex-col gap-2">
          <span className="text-xs text-fg-muted">Tim</span>
          <div className="flex flex-wrap gap-1.5">
            {project.memberIds.map((m) => (
              <span key={m} className="inline-flex items-center gap-1.5 text-xs"><Avatar name={userName(m)} size="small" color={m === project.leadId ? "brand" : "neutral"} />{userName(m).split(" ")[0]}</span>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <Tabs variant="pill" value={view} onChange={setView} tabs={[{ value: "board", label: "Board" }, { value: "list", label: "List" }]} />
      </div>

      {view === "board" ? (
        <TaskBoard
          columns={columns}
          tasks={tasks}
          editable={editable}
          today={today}
          onOpen={(t) => setTask(t)}
          onAdd={(c) => setTask(newTask(c))}
          onMove={(taskId, columnId) => editable && run((s) => moveTask(s, taskId, columnId))}
        />
      ) : (
        <Table>
          <thead><tr><Th>Task</Th><Th>Kolom</Th><Th>Assignee</Th><Th>Prioritas</Th><Th>Deadline</Th></tr></thead>
          <tbody>
            {tasks.map((t) => (
              <Tr key={t.id} className="cursor-pointer" onClick={() => setTask(t)}>
                <Td>{t.title}</Td>
                <Td className="text-fg-muted">{columns.find((c) => c.id === t.columnId)?.name}</Td>
                <Td className="text-fg-muted">{userName(t.assigneeId)}</Td>
                <Td><PriorityBadge priority={t.priority} /></Td>
                <Td className="text-fg-muted">{t.deadline ? formatDate(t.deadline) : "-"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {task && <TaskDialog key={task.id ?? "new"} initial={task} memberIds={project.memberIds} readOnly={!editable} onClose={() => setTask(null)} />}
    </>
  );
}
