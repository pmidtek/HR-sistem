"use client";

import { useState } from "react";
import { useAuthed } from "@/store/app-provider";
import { moveTask } from "@/store/actions-tasks";
import { stamp } from "@/store/project-core";
import { TaskBoard } from "@/components/projects/task-board";
import { TaskDialog, type TaskDraft } from "@/components/projects/task-dialog";
import { useProject } from "@/components/projects/workspace/context";
import { Tabs } from "@/components/ui/tabs";

export default function BoardPage() {
  const { state, actor, today, run } = useAuthed();
  const { project, canEdit } = useProject();
  const boards = state.boards.filter((b) => b.projectId === project.id).sort((a, b) => a.order - b.order);
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [task, setTask] = useState<TaskDraft | null>(null);
  const columns = state.boardColumns.filter((c) => c.boardId === boardId).sort((a, b) => a.order - b.order);
  const tasks = state.tasks.filter((t) => t.boardId === boardId).sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-4">
      <Tabs variant="pill" value={boardId} onChange={setBoardId} tabs={boards.map((b) => ({ value: b.id, label: b.name }))} />
      <TaskBoard
        columns={columns}
        tasks={tasks}
        editable={canEdit}
        today={today}
        onOpen={(t) => setTask(t)}
        onAdd={(columnId) => setTask({ projectId: project.id, boardId, columnId, title: "" })}
        onMove={(taskId, columnId) => canEdit && run((s) => moveTask(s, taskId, columnId, null, actor, stamp(today)))}
      />
      {task && <TaskDialog key={task.id ?? "new"} initial={task} memberIds={project.memberIds} readOnly={!canEdit} onClose={() => setTask(null)} />}
    </div>
  );
}
