/** Logic murni Project Workspace: progress, keterlambatan, agenda, beban tim, dependensi, penomoran. */
import type { BoardColumn, Task } from "../types";
import { addDays, diffDays } from "./dates";

/** "CR" + 1 → "CR-001" */
export function refLabel(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

export function taskRef(task: Pick<Task, "number">): string {
  return `#${task.number}`;
}

/** Nomor berikutnya: terbesar + 1 (aman walau ada nomor yang dihapus). */
export function nextNumber(existing: number[]): number {
  return existing.reduce((m, n) => Math.max(m, n), 0) + 1;
}

export function doneColumnIds(columns: BoardColumn[]): Set<string> {
  return new Set(columns.filter((c) => c.isDone).map((c) => c.id));
}

export type Progress = { done: number; total: number; percent: number };

export function progressOf(tasks: Task[], doneCols: Set<string>): Progress {
  const done = tasks.filter((t) => doneCols.has(t.columnId)).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export function isOverdue(task: Task, doneCols: Set<string>, today: string): boolean {
  return !doneCols.has(task.columnId) && task.deadline !== null && task.deadline < today;
}

export function daysOverdue(task: Task, today: string): number {
  return task.deadline ? Math.max(0, diffDays(task.deadline, today)) : 0;
}

/**
 * "Perlu perhatian": task belum selesai yang terlambat atau blocked.
 * Urutan paling parah: blocked + terlambat, lalu paling lama terlambat, lalu blocked saja.
 */
export function attentionTasks(tasks: Task[], doneCols: Set<string>, today: string): Task[] {
  const score = (t: Task) => (t.blocked ? 1000 : 0) + daysOverdue(t, today);
  return tasks
    .filter((t) => !doneCols.has(t.columnId) && (t.blocked || isOverdue(t, doneCols, today)))
    .sort((a, b) => score(b) - score(a) || a.number - b.number);
}

export type AgendaKind = "task" | "milestone" | "deliverable" | "sprint";
export type AgendaItem = { date: string; kind: AgendaKind; label: string; ref: string | null };

/** Item dalam rentang hari ini s/d +days-1, dikelompokkan per tanggal (urut). */
export function agenda(items: AgendaItem[], today: string, days = 14): { date: string; items: AgendaItem[] }[] {
  const end = addDays(today, days - 1);
  const inRange = items.filter((i) => i.date >= today && i.date <= end);
  const dates = [...new Set(inRange.map((i) => i.date))].sort();
  return dates.map((date) => ({ date, items: inRange.filter((i) => i.date === date) }));
}

export type Workload = { userId: string | null; open: number; inProgress: number; overdue: number };

/**
 * Beban per anggota. "Berjalan" = belum selesai dan sudah keluar dari kolom pertama board-nya.
 * Baris userId null = task tanpa assignee (selalu di paling bawah).
 */
export function workload(tasks: Task[], columns: BoardColumn[], memberIds: string[], today: string): Workload[] {
  const doneCols = doneColumnIds(columns);
  const firstCol = new Map<string, string>();
  for (const c of [...columns].sort((a, b) => a.order - b.order)) if (!firstCol.has(c.boardId)) firstCol.set(c.boardId, c.id);
  const open = tasks.filter((t) => !doneCols.has(t.columnId));
  const row = (list: Task[], userId: string | null): Workload => ({
    userId,
    open: list.length,
    inProgress: list.filter((t) => firstCol.get(t.boardId) !== t.columnId).length,
    overdue: list.filter((t) => isOverdue(t, doneCols, today)).length,
  });
  return [
    ...memberIds.map((id) => row(open.filter((t) => t.assigneeIds.includes(id)), id)),
    row(open.filter((t) => t.assigneeIds.length === 0), null),
  ];
}

/** true jika `taskId` bergantung pada `candidateDeps` akan membentuk lingkaran. */
export function createsCycle(tasks: Pick<Task, "id" | "dependsOn">[], taskId: string, candidateDeps: string[]): boolean {
  const deps = new Map(tasks.map((t) => [t.id, t.dependsOn]));
  deps.set(taskId, candidateDeps);
  const seen = new Set<string>();
  const stack = [...candidateDeps];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined) break;
    if (id === taskId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(deps.get(id) ?? []));
  }
  return false;
}

/** Sisa hari ke tanggal target (negatif = lewat). */
export function daysLeft(target: string, today: string): number {
  return diffDays(today, target);
}

export type TaskFilters = {
  /** "" = semua; "none" = tanpa assignee. */
  assigneeId: string;
  priority: string;
  labelId: string;
  epicId: string;
  onlyMine: boolean;
  query: string;
};

export const emptyFilters: TaskFilters = { assigneeId: "", priority: "", labelId: "", epicId: "", onlyMine: false, query: "" };

/** Filter task board. `storyEpic` memetakan storyId → epicId. Pencarian pada judul & nomor (#12). */
export function filterTasks(tasks: Task[], f: TaskFilters, userId: string, storyEpic: Map<string, string>): Task[] {
  const q = f.query.trim().toLowerCase().replace(/^#/, "");
  return tasks.filter((t) => {
    if (f.onlyMine && !t.assigneeIds.includes(userId)) return false;
    if (f.assigneeId === "none" && t.assigneeIds.length > 0) return false;
    if (f.assigneeId && f.assigneeId !== "none" && !t.assigneeIds.includes(f.assigneeId)) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.labelId && !t.labels.includes(f.labelId)) return false;
    if (f.epicId && (t.storyId === null || storyEpic.get(t.storyId) !== f.epicId)) return false;
    if (q && !t.title.toLowerCase().includes(q) && String(t.number) !== q) return false;
    return true;
  });
}

export function activeFilterCount(f: TaskFilters): number {
  return [f.assigneeId, f.priority, f.labelId, f.epicId].filter(Boolean).length + (f.onlyMine ? 1 : 0);
}

export type MilestoneState = "done" | "late" | "open";

/** Status milestone: selesai jika ditandai; terlambat jika lewat target dan belum selesai. */
export function milestoneState(m: { targetDate: string; completedAt: string | null }, today: string): MilestoneState {
  if (m.completedAt) return "done";
  return m.targetDate < today ? "late" : "open";
}

/** Deliverable terlambat: lewat deadline dan belum terkirim. */
export function isDeliverableLate(d: { deadline: string | null; status: string }, today: string): boolean {
  return d.status !== "sent" && d.deadline !== null && d.deadline < today;
}
