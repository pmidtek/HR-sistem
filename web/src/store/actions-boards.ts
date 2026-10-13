/** Aksi project, board, dan kolom (simulasi endpoint). */
import type { Actor } from "@/lib/calc/approval";
import type { Board } from "@/lib/project-types";
import type { BoardColumn, Project } from "@/lib/types";
import { syncMembers } from "@/lib/projects";
import { ActionError } from "./actions";
import { assertManage, replaceById, withActivity, withNotify } from "./project-core";
import { newId, type DataState } from "./state";

function nextProjectCode(existing: string[], year: string): string {
  const yy = year.slice(2);
  const max = existing.filter((c) => c.startsWith(`PR${yy}`)).reduce((m, c) => Math.max(m, Number(c.slice(4))), 0);
  return `PR${yy}${String(max + 1).padStart(4, "0")}`;
}

function columnsFor(projectId: string, boardId: string, names: string[]): BoardColumn[] {
  const doneName = names[names.length - 1];
  return names.map((name, i) => ({ id: newId("col"), projectId, boardId, name, order: i, isDone: name === doneName, color: null }));
}

export type NewProjectInput = Pick<Project, "name" | "companyId" | "teamIds" | "startDate" | "targetDate"> & { leadId: string; memberIds: string[] };

export function createProject(s: DataState, input: NewProjectInput, actor: Actor, today: string, at: string): DataState {
  if (actor.role !== "stakeholder" && actor.id !== input.leadId) throw new ActionError("Hanya stakeholder yang bisa membuat project untuk orang lain.");
  if (!input.name.trim()) throw new ActionError("Nama project wajib diisi.");
  if (input.targetDate < input.startDate) throw new ActionError("Target selesai harus setelah tanggal mulai.");
  const id = newId("p");
  const code = nextProjectCode(s.projects.map((p) => p.code), today.slice(0, 4));
  const defaultColumns = ["Backlog", "To Do", "In Progress", "Review", "Done"];
  const project: Project = syncMembers({
    id, code, name: input.name.trim(), opportunityId: null, companyId: input.companyId, teamIds: input.teamIds,
    startDate: input.startDate, targetDate: input.targetDate, status: "not_started", description: "", color: "var(--color-brand-brand-500)",
    members: [
      { userId: input.leadId, role: "lead" as const, joinedAt: today },
      ...input.memberIds.filter((m) => m !== input.leadId).map((userId) => ({ userId, role: "member" as const, joinedAt: today })),
    ],
    labels: [], defaultColumns, quickLinkIds: [], clientContactRoles: {}, archived: false,
  });
  const board: Board = { id: newId("b"), projectId: id, name: "Board utama", order: 0 };
  let next: DataState = {
    ...s,
    projects: [project, ...s.projects],
    boards: [...s.boards, board],
    boardColumns: [...s.boardColumns, ...columnsFor(id, board.id, defaultColumns)],
  };
  next = withActivity(next, id, actor.id, at, "settings", `Project dibuat: ${project.name}`);
  return withNotify(next, project.memberIds, actor.id, "Ditambahkan ke project", `Anda ditambahkan ke project ${code} — ${project.name}.`, `/projects/${id}`, at);
}

export function createBoard(s: DataState, projectId: string, name: string, actor: Actor, at: string): DataState {
  const p = assertManage(s, projectId, actor);
  if (!name.trim()) throw new ActionError("Nama board wajib diisi.");
  const order = s.boards.filter((b) => b.projectId === projectId).length;
  const board: Board = { id: newId("b"), projectId, name: name.trim(), order };
  const next: DataState = { ...s, boards: [...s.boards, board], boardColumns: [...s.boardColumns, ...columnsFor(projectId, board.id, p.defaultColumns)] };
  return withActivity(next, projectId, actor.id, at, "board", `Board dibuat: ${board.name}`);
}

export function renameBoard(s: DataState, boardId: string, name: string, actor: Actor, at: string): DataState {
  const board = s.boards.find((b) => b.id === boardId);
  if (!board) throw new ActionError("Board tidak ditemukan.");
  assertManage(s, board.projectId, actor);
  if (!name.trim()) throw new ActionError("Nama board wajib diisi.");
  const next: DataState = { ...s, boards: replaceById(s.boards, boardId, (b) => ({ ...b, name: name.trim() })) };
  return withActivity(next, board.projectId, actor.id, at, "board", `Board diganti nama menjadi ${name.trim()}`);
}

/** Hapus board. Task di dalamnya ikut terhapus; board terakhir tidak bisa dihapus. */
export function deleteBoard(s: DataState, boardId: string, actor: Actor, at: string): DataState {
  const board = s.boards.find((b) => b.id === boardId);
  if (!board) throw new ActionError("Board tidak ditemukan.");
  assertManage(s, board.projectId, actor);
  if (s.boards.filter((b) => b.projectId === board.projectId).length <= 1) throw new ActionError("Project minimal punya satu board.");
  const removed = new Set(s.tasks.filter((t) => t.boardId === boardId).map((t) => t.id));
  const next: DataState = {
    ...s,
    boards: s.boards.filter((b) => b.id !== boardId),
    boardColumns: s.boardColumns.filter((c) => c.boardId !== boardId),
    tasks: s.tasks.filter((t) => !removed.has(t.id)).map((t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => !removed.has(d)) })),
  };
  return withActivity(next, board.projectId, actor.id, at, "board", `Board dihapus: ${board.name} (${removed.size} task)`);
}

export function addColumn(s: DataState, boardId: string, name: string, actor: Actor, at: string): DataState {
  const board = s.boards.find((b) => b.id === boardId);
  if (!board) throw new ActionError("Board tidak ditemukan.");
  assertManage(s, board.projectId, actor);
  if (!name.trim()) throw new ActionError("Nama kolom wajib diisi.");
  const order = s.boardColumns.filter((c) => c.boardId === boardId).reduce((m, c) => Math.max(m, c.order), -1) + 1;
  const col: BoardColumn = { id: newId("col"), projectId: board.projectId, boardId, name: name.trim(), order, isDone: false, color: null };
  return withActivity({ ...s, boardColumns: [...s.boardColumns, col] }, board.projectId, actor.id, at, "board", `Kolom ditambahkan: ${col.name}`);
}

export function updateColumn(s: DataState, columnId: string, patch: Partial<Pick<BoardColumn, "name" | "color" | "isDone">>, actor: Actor, at: string): DataState {
  const col = s.boardColumns.find((c) => c.id === columnId);
  if (!col) throw new ActionError("Kolom tidak ditemukan.");
  assertManage(s, col.projectId, actor);
  if (patch.name !== undefined && !patch.name.trim()) throw new ActionError("Nama kolom wajib diisi.");
  let next: DataState = { ...s, boardColumns: replaceById(s.boardColumns, columnId, (c) => ({ ...c, ...patch })) };
  if (patch.isDone !== undefined && patch.isDone !== col.isDone) {
    // Status selesai task di kolom ini ikut berubah.
    next = { ...next, tasks: next.tasks.map((t) => (t.columnId === columnId ? { ...t, completedAt: patch.isDone ? (t.completedAt ?? at) : null } : t)) };
  }
  return withActivity(next, col.projectId, actor.id, at, "board", `Kolom diperbarui: ${patch.name ?? col.name}`);
}

/** Hapus kolom. Jika berisi task, wajib pilih kolom tujuan di board yang sama. */
export function deleteColumn(s: DataState, columnId: string, targetColumnId: string | null, actor: Actor, at: string): DataState {
  const col = s.boardColumns.find((c) => c.id === columnId);
  if (!col) throw new ActionError("Kolom tidak ditemukan.");
  assertManage(s, col.projectId, actor);
  const inCol = s.tasks.filter((t) => t.columnId === columnId);
  const target = s.boardColumns.find((c) => c.id === targetColumnId && c.boardId === col.boardId && c.id !== columnId);
  if (inCol.length > 0 && !target) throw new ActionError("Pilih kolom tujuan untuk task di kolom ini.");
  if (s.boardColumns.filter((c) => c.boardId === col.boardId).length <= 1) throw new ActionError("Board minimal punya satu kolom.");
  const next: DataState = {
    ...s,
    boardColumns: s.boardColumns.filter((c) => c.id !== columnId),
    tasks: s.tasks.map((t) =>
      t.columnId === columnId && target ? { ...t, columnId: target.id, completedAt: target.isDone ? (t.completedAt ?? at) : null } : t,
    ),
  };
  return withActivity(next, col.projectId, actor.id, at, "board", `Kolom dihapus: ${col.name}`);
}

