"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { taskRef } from "@/lib/calc/project";
import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { addAttachment, addComment, createTask, deleteTask, removeAttachment, updateTask, type TaskPatch } from "@/store/actions-tasks";
import { stamp } from "@/store/project-core";
import { newId } from "@/store/state";
import { useLookups } from "../../hooks";
import { Button } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { Badge } from "../../ui/display";
import { Select } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { Sheet } from "../../ui/sheet";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";
import { TaskComments } from "./task-comments";
import { TaskFields } from "./task-fields";
import { TaskAttachments, TaskDependencies, TaskDescription, TaskSubtasks } from "./task-sections";

export type SheetTarget = { kind: "edit"; taskId: string } | { kind: "create"; boardId: string; columnId: string };

type Props = { target: SheetTarget; data: ProjectData; onClose: () => void; onOpenTask: (id: string) => void };

/** Detail task dari kanan. Mode buat: judul + kolom, lalu langsung terbuka sebagai detail. */
export function TaskSheet({ target, data, onClose, onOpenTask }: Props) {
  const { state, actor, today, run } = useAuthed();
  const { project, canEdit } = useProject();
  const { userName } = useLookups();
  const [title, setTitle] = useState("");
  const [columnId, setColumnId] = useState(target.kind === "create" ? target.columnId : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const at = () => stamp(today);

  if (target.kind === "create") {
    const create = () => {
      const id = newId("task");
      if (run((s) => createTask(s, { projectId: project.id, boardId: target.boardId, columnId, title }, actor, at(), id), "Task dibuat.")) onOpenTask(id);
    };
    return (
      <Sheet open onOpenChange={(o) => !o && onClose()} title="Task baru" header={<p className="font-display text-lg font-medium">Task baru</p>}
        footer={<><Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button><Button className="ml-auto" disabled={!title.trim()} onClick={create}>Buat task</Button></>}>
        <div className="flex flex-col gap-4">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && title.trim() && create()} placeholder="Judul task" className="h-11 w-full rounded-xxs bg-sunken px-3 font-display text-lg text-fg shadow-[inset_0_0_0_1px_var(--border-default)] focus:shadow-[inset_0_0_0_1px_var(--brand)] focus:outline-none" />
          <Select label="Kolom" value={columnId} onChange={(e) => setColumnId(e.target.value)} options={data.columns.filter((c) => c.boardId === target.boardId).map((c) => ({ value: c.id, label: c.name }))} />
          <p className="text-xs text-fg-subtle">Detail lain (assignee, jadwal, subtask, dll) bisa diisi setelah task dibuat.</p>
        </div>
      </Sheet>
    );
  }

  const task = data.taskById.get(target.taskId);
  if (!task) return null;
  const patch = (p: TaskPatch) => run((s) => updateTask(s, task.id, p, actor, at()));
  const board = data.boards.find((b) => b.id === task.boardId);
  const ref = taskRef(task);
  const history = state.activityLogs.filter((a) => a.projectId === project.id && a.targetRef === ref);

  return (
    <>
      <Sheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={`${ref} ${task.title}`}
        header={
          <div className="flex flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-2 font-mono text-xs text-fg-subtle">
              {ref} · {board?.name}
              {data.doneCols.has(task.columnId) && <Badge tone="success">Selesai</Badge>}
              {task.blocked && <Badge tone="danger">Blocked</Badge>}
            </span>
            <input
              defaultValue={task.title} key={task.title} readOnly={!canEdit} aria-label="Judul task"
              onBlur={(e) => e.target.value.trim() && e.target.value !== task.title && patch({ title: e.target.value.trim() })}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-full rounded-xxs bg-transparent font-display text-xl font-medium text-fg focus:bg-sunken focus:outline-none"
            />
            <span className="text-xs text-fg-subtle">Dibuat {userName(task.createdBy)} · {formatDate(task.createdAt.slice(0, 10))}</span>
          </div>
        }
        footer={canEdit && (
          <Button variant="ghost" tone="danger" size="small" iconLeft={<Icon icon={Trash2} size={14} />} onClick={() => setConfirmDelete(true)}>Hapus task</Button>
        )}
      >
        <div className="flex flex-col gap-5">
          <TaskFields task={task} data={data} editable={canEdit} onPatch={patch} />
          <TaskDescription key={task.id} value={task.description} editable={canEdit} onSave={(v) => patch({ description: v })} />
          <TaskSubtasks task={task} editable={canEdit} onPatch={patch} />
          <TaskDependencies task={task} data={data} editable={canEdit} onPatch={patch} onOpen={onOpenTask} />
          <TaskAttachments task={task} editable={canEdit}
            onAdd={(f) => run((s) => addAttachment(s, task.id, f, actor, at()), `Lampiran ${f.name} ditambahkan.`)}
            onRemove={(id) => run((s) => removeAttachment(s, task.id, id, actor, at()))} />
          <TaskComments task={task} members={data.members} history={history} now={at()} editable={canEdit} userName={userName}
            onComment={(body) => run((s) => addComment(s, task.id, body, actor, at()))} />
        </div>
      </Sheet>
      <ConfirmDialog
        open={confirmDelete} onOpenChange={setConfirmDelete} title={`Hapus ${ref}?`}
        description={`"${task.title}" akan dihapus permanen beserta subtask, komentar, dan lampirannya.`}
        onConfirm={() => { if (run((s) => deleteTask(s, task.id, actor, at()), "Task dihapus.")) { setConfirmDelete(false); onClose(); } }}
      />
    </>
  );
}
