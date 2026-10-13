"use client";

import { useMemo, useState } from "react";
import { emptyFilters, filterTasks, type TaskFilters } from "@/lib/calc/project";
import { useAuthed } from "@/store/app-provider";
import { BoardDialog } from "@/components/projects/board/board-dialog";
import { BoardToolbar, type BoardDialogMode, type BoardView } from "@/components/projects/board/board-toolbar";
import { EpicPanel } from "@/components/projects/board/epic-panel";
import { Kanban } from "@/components/projects/board/kanban";
import { TaskListView } from "@/components/projects/board/task-list-view";
import { TaskSheet, type SheetTarget } from "@/components/projects/task-sheet/task-sheet";
import { useProjectData } from "@/components/projects/use-project-data";
import { useQueryParam, useQueryUpdater } from "@/components/projects/use-query-param";
import { Gantt } from "@/components/projects/gantt/gantt";

const VIEWS: BoardView[] = ["kanban", "list", "gantt"];

export default function BoardPage() {
  const { user } = useAuthed();
  const data = useProjectData();
  const [boardParam, setBoardParam] = useQueryParam("board");
  const [viewParam, setViewParam] = useQueryParam("view");
  const [taskParam] = useQueryParam("task");
  const [newParam] = useQueryParam("new");
  const updateQuery = useQueryUpdater();
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
  const [createIn, setCreateIn] = useState<string | null>(null);
  const [boardDialog, setBoardDialog] = useState<BoardDialogMode | null>(null);
  const [epicsOpen, setEpicsOpen] = useState(false);

  const boardId = data.boards.some((b) => b.id === boardParam) ? (boardParam ?? "") : (data.boards[0]?.id ?? "");
  const view: BoardView = VIEWS.find((v) => v === viewParam) ?? "kanban";
  const filtered = useMemo(() => filterTasks(data.tasks, filters, user.id, data.storyEpic), [data, filters, user.id]);
  const boardTasks = filtered.filter((t) => t.boardId === boardId);
  const firstColumn = data.columns.find((c) => c.boardId === boardId)?.id ?? "";

  // ?new=task (dari tombol "Baru" di header) membuka form task baru.
  const creatingColumn = createIn ?? (newParam === "task" ? firstColumn : null);
  const target: SheetTarget | null = taskParam
    ? { kind: "edit", taskId: taskParam }
    : creatingColumn
      ? { kind: "create", boardId, columnId: creatingColumn }
      : null;

  const closeSheet = () => {
    setCreateIn(null);
    updateQuery({ new: null, task: null });
  };
  const openTask = (id: string) => {
    setCreateIn(null);
    updateQuery({ new: null, task: id });
  };

  return (
    <div className="flex flex-col gap-5">
      <BoardToolbar
        data={data}
        boardId={boardId}
        onBoard={setBoardParam}
        view={view}
        onView={(v) => setViewParam(v === "kanban" ? null : v)}
        filters={filters}
        onFilters={setFilters}
        onBoardDialog={setBoardDialog}
        onEpics={() => setEpicsOpen(true)}
        onNewTask={() => setCreateIn(firstColumn)}
      />
      {view === "kanban" && <Kanban boardId={boardId} tasks={boardTasks} data={data} onOpenTask={openTask} onNewTask={setCreateIn} />}
      {view === "list" && <TaskListView tasks={boardTasks} data={data} onOpenTask={openTask} />}
      {view === "gantt" && <Gantt tasks={filtered} data={data} onOpenTask={openTask} />}

      {target && <TaskSheet key={target.kind === "edit" ? target.taskId : "new"} target={target} data={data} onClose={closeSheet} onOpenTask={openTask} />}
      {boardDialog && <BoardDialog mode={boardDialog} boardId={boardId} data={data} onClose={() => setBoardDialog(null)} onSelect={setBoardParam} />}
      {epicsOpen && <EpicPanel data={data} onClose={() => setEpicsOpen(false)} />}
    </div>
  );
}
