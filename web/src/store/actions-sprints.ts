/** Aksi sprint (kelola: lead/stakeholder). Satu sprint aktif per tim. */
import type { Actor } from "@/lib/calc/approval";
import type { Sprint } from "@/lib/project-types";
import { ActionError } from "./actions";
import { assertManage, replaceById, withActivity } from "./project-core";
import { newId, type DataState } from "./state";

export type SprintInput = Pick<Sprint, "name" | "teamId" | "goal" | "startDate" | "endDate"> & { id?: string };

function getSprint(s: DataState, sprintId: string): Sprint {
  const sp = s.sprints.find((x) => x.id === sprintId);
  if (!sp) throw new ActionError("Sprint tidak ditemukan.");
  return sp;
}

const isDone = (s: DataState, columnId: string) => s.boardColumns.find((c) => c.id === columnId)?.isDone ?? false;

export function saveSprint(s: DataState, projectId: string, input: SprintInput, actor: Actor, at: string): DataState {
  assertManage(s, projectId, actor);
  if (!input.name.trim()) throw new ActionError("Nama sprint wajib diisi.");
  if (!input.startDate || !input.endDate || input.endDate < input.startDate) throw new ActionError("Tanggal selesai harus setelah tanggal mulai.");
  const name = input.name.trim();
  if (input.id) {
    const next: DataState = { ...s, sprints: replaceById(s.sprints, input.id, (sp) => ({ ...sp, ...input, name })) };
    return withActivity(next, projectId, actor.id, at, "sprint", `Sprint diperbarui: ${name}`);
  }
  const created: Sprint = { ...input, name, id: newId("sp"), projectId, status: "planned", plannedTaskIds: [], completedAt: null };
  return withActivity({ ...s, sprints: [...s.sprints, created] }, projectId, actor.id, at, "sprint", `Sprint dibuat: ${name}`);
}

/** Atur task di sprint: task terpilih masuk, task lama yang tidak dipilih kembali ke backlog. */
export function setSprintTasks(s: DataState, sprintId: string, taskIds: string[], actor: Actor, at: string): DataState {
  const sp = getSprint(s, sprintId);
  assertManage(s, sp.projectId, actor);
  if (sp.status === "completed") throw new ActionError("Sprint yang sudah selesai tidak bisa diubah.");
  const chosen = new Set(taskIds);
  const tasks = s.tasks.map((t) => {
    if (t.projectId !== sp.projectId) return t;
    if (chosen.has(t.id)) return { ...t, sprintId };
    return t.sprintId === sprintId ? { ...t, sprintId: null } : t;
  });
  return withActivity({ ...s, tasks }, sp.projectId, actor.id, at, "sprint", `Task ${sp.name} diatur (${taskIds.length} task)`);
}

export function startSprint(s: DataState, sprintId: string, actor: Actor, at: string): DataState {
  const sp = getSprint(s, sprintId);
  assertManage(s, sp.projectId, actor);
  if (sp.status !== "planned") throw new ActionError("Hanya sprint yang direncanakan yang bisa dimulai.");
  const clash = s.sprints.find((x) => x.projectId === sp.projectId && x.status === "active" && x.teamId === sp.teamId);
  if (clash) throw new ActionError(`Masih ada sprint aktif untuk tim ini (${clash.name}). Selesaikan dulu.`);
  const planned = s.tasks.filter((t) => t.sprintId === sprintId).map((t) => t.id);
  const next: DataState = { ...s, sprints: replaceById(s.sprints, sprintId, (x) => ({ ...x, status: "active", plannedTaskIds: planned })) };
  return withActivity(next, sp.projectId, actor.id, at, "sprint_started", `${sp.name} dimulai (${planned.length} task)`);
}

/** Selesaikan sprint. Task belum selesai dipindah ke `moveToSprintId` atau backlog (null). */
export function completeSprint(s: DataState, sprintId: string, moveToSprintId: string | null, actor: Actor, at: string): DataState {
  const sp = getSprint(s, sprintId);
  assertManage(s, sp.projectId, actor);
  if (sp.status !== "active") throw new ActionError("Hanya sprint aktif yang bisa diselesaikan.");
  if (moveToSprintId) {
    const target = getSprint(s, moveToSprintId);
    if (target.projectId !== sp.projectId || target.status === "completed" || target.id === sprintId) throw new ActionError("Sprint tujuan tidak valid.");
  }
  const unfinished = s.tasks.filter((t) => t.sprintId === sprintId && !isDone(s, t.columnId));
  const moved = new Set(unfinished.map((t) => t.id));
  const next: DataState = {
    ...s,
    sprints: replaceById(s.sprints, sprintId, (x) => ({ ...x, status: "completed", completedAt: at })),
    tasks: s.tasks.map((t) => (moved.has(t.id) ? { ...t, sprintId: moveToSprintId } : t)),
  };
  const where = moveToSprintId ? (s.sprints.find((x) => x.id === moveToSprintId)?.name ?? "sprint berikut") : "backlog";
  return withActivity(next, sp.projectId, actor.id, at, "sprint_completed", `${sp.name} selesai · ${unfinished.length} task dipindah ke ${where}`);
}

export function deleteSprint(s: DataState, sprintId: string, actor: Actor, at: string): DataState {
  const sp = getSprint(s, sprintId);
  assertManage(s, sp.projectId, actor);
  if (sp.status !== "planned") throw new ActionError("Hanya sprint yang belum dimulai yang bisa dihapus.");
  const next: DataState = {
    ...s,
    sprints: s.sprints.filter((x) => x.id !== sprintId),
    tasks: s.tasks.map((t) => (t.sprintId === sprintId ? { ...t, sprintId: null } : t)),
  };
  return withActivity(next, sp.projectId, actor.id, at, "sprint", `Sprint dihapus: ${sp.name}`);
}
