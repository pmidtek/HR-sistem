/** Aksi task project (simulasi endpoint). Semua perubahan tercatat di activity log. */
import type { Actor } from "@/lib/calc/approval";
import { createsCycle, nextNumber, taskRef } from "@/lib/calc/project";
import type { Attachment, Task } from "@/lib/types";
import { ActionError } from "./actions";
import { assertEdit, replaceById, withActivity, withNotify } from "./project-core";
import { newId, type DataState } from "./state";

export type TaskInput = Pick<Task, "projectId" | "boardId" | "columnId" | "title"> &
  Partial<Omit<Task, "id" | "projectId" | "boardId" | "columnId" | "title" | "number" | "order" | "createdBy" | "createdAt" | "completedAt">>;

export type TaskPatch = Partial<Omit<Task, "id" | "projectId" | "number" | "createdBy" | "createdAt" | "completedAt" | "comments" | "attachments">>;

function getTask(s: DataState, taskId: string): Task {
  const t = s.tasks.find((x) => x.id === taskId);
  if (!t) throw new ActionError("Task tidak ditemukan.");
  return t;
}

const isDoneCol = (s: DataState, columnId: string) => s.boardColumns.find((c) => c.id === columnId)?.isDone ?? false;
const colName = (s: DataState, columnId: string) => s.boardColumns.find((c) => c.id === columnId)?.name ?? "";

function assertDeps(s: DataState, task: Pick<Task, "id" | "projectId">, deps: string[]) {
  if (createsCycle(s.tasks.filter((t) => t.projectId === task.projectId), task.id, deps)) {
    throw new ActionError("Dependensi melingkar: task ini tidak bisa bergantung pada task tersebut.");
  }
}

function notifyAssigned(s: DataState, task: Task, newIds: string[], actor: Actor, at: string): DataState {
  return withNotify(s, newIds, actor.id, "Task baru untuk Anda", `${taskRef(task)} ${task.title}`, `/projects/${task.projectId}/board?task=${task.id}`, at);
}

/** `id` boleh diberikan dari UI supaya detail task bisa langsung dibuka setelah dibuat. */
export function createTask(s: DataState, input: TaskInput, actor: Actor, at: string, id: string = newId("task")): DataState {
  assertEdit(s, input.projectId, actor);
  if (!input.title.trim()) throw new ActionError("Judul task wajib diisi.");
  const own = s.tasks.filter((t) => t.projectId === input.projectId);
  const inColumn = own.filter((t) => t.columnId === input.columnId);
  const task: Task = {
    description: "", assigneeIds: [], priority: "medium", labels: [], storyId: null, sprintId: null, startDate: null, deadline: null,
    estimateHours: null, dependsOn: [], blocked: false, blockedReason: null, checklist: [], comments: [], attachments: [],
    ...input,
    title: input.title.trim(), id, number: nextNumber(own.map((t) => t.number)),
    order: inColumn.reduce((m, t) => Math.max(m, t.order), 0) + 1,
    createdBy: actor.id, createdAt: at, completedAt: isDoneCol(s, input.columnId) ? at : null,
  };
  assertDeps(s, task, task.dependsOn);
  let next: DataState = { ...s, tasks: [...s.tasks, task] };
  next = withActivity(next, task.projectId, actor.id, at, "task_created", `Task dibuat: ${task.title}`, taskRef(task));
  return notifyAssigned(next, task, task.assigneeIds, actor, at);
}

export function updateTask(s: DataState, taskId: string, patch: TaskPatch, actor: Actor, at: string): DataState {
  const old = getTask(s, taskId);
  assertEdit(s, old.projectId, actor);
  if (patch.title !== undefined && !patch.title.trim()) throw new ActionError("Judul task wajib diisi.");
  if (patch.dependsOn) assertDeps(s, old, patch.dependsOn);
  if (patch.blocked && !(patch.blockedReason ?? old.blockedReason)?.trim()) throw new ActionError("Alasan blocked wajib diisi.");
  const columnChanged = patch.columnId !== undefined && patch.columnId !== old.columnId;
  const nowDone = columnChanged && patch.columnId ? isDoneCol(s, patch.columnId) : isDoneCol(s, old.columnId);
  const updated: Task = {
    ...old,
    ...patch,
    blockedReason: patch.blocked === false ? null : (patch.blockedReason ?? old.blockedReason),
    completedAt: nowDone ? (old.completedAt ?? at) : null,
  };
  let next: DataState = { ...s, tasks: replaceById(s.tasks, taskId, () => updated) };
  const ref = taskRef(old);
  if (columnChanged) {
    next = withActivity(next, old.projectId, actor.id, at, nowDone ? "task_done" : "task_moved", `Task dipindahkan ke ${colName(s, updated.columnId)}`, ref);
  }
  if (patch.blocked !== undefined && patch.blocked !== old.blocked) {
    next = withActivity(next, old.projectId, actor.id, at, "task_updated", patch.blocked ? "Task ditandai blocked" : "Blocked dibuka", ref);
  }
  const checklistDone = (patch.checklist ?? []).filter((c) => c.done && !old.checklist.find((o) => o.id === c.id)?.done);
  for (const c of checklistDone) next = withActivity(next, old.projectId, actor.id, at, "subtask", `Subtask "${c.text}" diselesaikan`, ref);
  const otherKeys = Object.keys(patch).filter((k) => !["columnId", "blocked", "blockedReason", "checklist", "order"].includes(k));
  if (otherKeys.length > 0) next = withActivity(next, old.projectId, actor.id, at, "task_updated", "Task diperbarui", ref);
  const added = (patch.assigneeIds ?? []).filter((id) => !old.assigneeIds.includes(id));
  return notifyAssigned(next, updated, added, actor, at);
}

/** Pindah task ke kolom (boleh sama) dan sisipkan sebelum `beforeTaskId` (null = paling bawah). */
export function moveTask(s: DataState, taskId: string, columnId: string, beforeTaskId: string | null, actor: Actor, at: string): DataState {
  const task = getTask(s, taskId);
  assertEdit(s, task.projectId, actor);
  const target = s.tasks.filter((t) => t.columnId === columnId && t.id !== taskId).sort((a, b) => a.order - b.order);
  const idx = beforeTaskId ? target.findIndex((t) => t.id === beforeTaskId) : -1;
  const ordered = [...target];
  ordered.splice(idx === -1 ? ordered.length : idx, 0, task);
  const orderOf = new Map(ordered.map((t, i) => [t.id, i]));
  let next: DataState = { ...s, tasks: s.tasks.map((t) => (orderOf.has(t.id) ? { ...t, order: orderOf.get(t.id) ?? t.order } : t)) };
  if (columnId !== task.columnId) next = updateTask(next, taskId, { columnId }, actor, at);
  return next;
}

export function deleteTask(s: DataState, taskId: string, actor: Actor, at: string): DataState {
  const task = getTask(s, taskId);
  assertEdit(s, task.projectId, actor);
  const next: DataState = {
    ...s,
    tasks: s.tasks.filter((t) => t.id !== taskId).map((t) => (t.dependsOn.includes(taskId) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== taskId) } : t)),
    milestones: s.milestones.map((m) => ({ ...m, taskIds: m.taskIds.filter((id) => id !== taskId) })),
  };
  return withActivity(next, task.projectId, actor.id, at, "task_deleted", `Task dihapus: ${task.title}`, taskRef(task));
}

export function addComment(s: DataState, taskId: string, body: string, actor: Actor, at: string): DataState {
  const task = getTask(s, taskId);
  assertEdit(s, task.projectId, actor);
  if (!body.trim()) throw new ActionError("Komentar kosong.");
  const comment = { id: newId("cm"), authorId: actor.id, body: body.trim(), createdAt: at };
  let next: DataState = { ...s, tasks: replaceById(s.tasks, taskId, (t) => ({ ...t, comments: [...t.comments, comment] })) };
  next = withActivity(next, task.projectId, actor.id, at, "comment", "Komentar baru", taskRef(task));
  // @mention: kirim notifikasi ke anggota yang namanya disebut.
  const project = s.projects.find((p) => p.id === task.projectId);
  const mentioned = s.users.filter((u) => project?.memberIds.includes(u.id) && body.includes(`@${u.name.split(" ")[0]}`)).map((u) => u.id);
  return withNotify(next, mentioned, actor.id, "Anda disebut di komentar", `${taskRef(task)} ${task.title}`, `/projects/${task.projectId}/board?task=${task.id}`, at);
}

export function addAttachment(s: DataState, taskId: string, file: Pick<Attachment, "name" | "size">, actor: Actor, at: string): DataState {
  const task = getTask(s, taskId);
  assertEdit(s, task.projectId, actor);
  const att: Attachment = { id: newId("att"), name: file.name, size: file.size, url: "#", uploadedBy: actor.id, uploadedAt: at };
  const next: DataState = { ...s, tasks: replaceById(s.tasks, taskId, (t) => ({ ...t, attachments: [...t.attachments, att] })) };
  return withActivity(next, task.projectId, actor.id, at, "task_updated", `Lampiran ditambahkan: ${file.name}`, taskRef(task));
}

export function removeAttachment(s: DataState, taskId: string, attachmentId: string, actor: Actor, at: string): DataState {
  const task = getTask(s, taskId);
  assertEdit(s, task.projectId, actor);
  const next: DataState = { ...s, tasks: replaceById(s.tasks, taskId, (t) => ({ ...t, attachments: t.attachments.filter((a) => a.id !== attachmentId) })) };
  return withActivity(next, task.projectId, actor.id, at, "task_updated", "Lampiran dihapus", taskRef(task));
}
