import type { BoardColumn, Project, Task, User } from "./types";
import { diffDays } from "./calc/dates";

/** Progress (%) dihitung otomatis dari task yang ada di kolom "selesai". */
export function projectProgress(projectId: string, tasks: Task[], columns: BoardColumn[]): number {
  const own = tasks.filter((t) => t.projectId === projectId);
  if (own.length === 0) return 0;
  const doneCols = new Set(columns.filter((c) => c.projectId === projectId && c.isDone).map((c) => c.id));
  return Math.round((own.filter((t) => doneCols.has(t.columnId)).length / own.length) * 100);
}

export function isFinished(p: Project): boolean {
  return p.status === "done" || p.status === "cancelled";
}

export function isLate(p: Project, today: string): boolean {
  return !isFinished(p) && p.targetDate < today;
}

/** Mau selesai: target ≤ 14 hari lagi atau progress ≥ 80%. */
export function isNearlyDone(p: Project, progress: number, today: string): boolean {
  if (isFinished(p) || isLate(p, today)) return false;
  return diffDays(today, p.targetDate) <= 14 || progress >= 80;
}

/** Pegawai hanya melihat project yang ia ikuti; HR & Stakeholder melihat semua. */
export function canSeeProject(user: User, p: Project): boolean {
  return user.role === "stakeholder" || user.role === "hr" || p.memberIds.includes(user.id) || p.leadId === user.id;
}

export function canEditProject(user: User, p: Project): boolean {
  return p.memberIds.includes(user.id) || p.leadId === user.id;
}
