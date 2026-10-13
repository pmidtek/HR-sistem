/**
 * Hak akses & helper project (docs/PROJECT-WORKSPACE.md Bagian 15).
 * Semua cek akses project lewat sini, bukan tersebar di komponen.
 */
import { diffDays } from "./calc/dates";
import { doneColumnIds, progressOf } from "./calc/project";
import type { ProjectRole } from "./project-types";
import type { BoardColumn, Project, Task, User } from "./types";

/** leadId & memberIds selalu diturunkan dari `members` (satu sumber kebenaran). */
export function syncMembers<T extends Omit<Project, "leadId" | "memberIds">>(p: T): T & Pick<Project, "leadId" | "memberIds"> {
  const lead = p.members.find((m) => m.role === "lead") ?? p.members[0];
  return { ...p, leadId: lead?.userId ?? "", memberIds: p.members.map((m) => m.userId) };
}

export function projectRole(user: Pick<User, "id">, p: Project): ProjectRole | null {
  return p.members.find((m) => m.userId === user.id)?.role ?? null;
}

/** Anggota (lead/member/viewer), HR, dan Stakeholder bisa membuka project. */
export function canSeeProject(user: User, p: Project): boolean {
  return user.role === "stakeholder" || user.role === "hr" || projectRole(user, p) !== null;
}

/** Buat/edit task, komentar, catatan, MOM, tautan: member, lead, stakeholder. */
export function canEditProject(user: User, p: Project): boolean {
  if (p.archived) return false;
  const role = projectRole(user, p);
  return user.role === "stakeholder" || role === "lead" || role === "member";
}

/** Kelola board, kolom, epic, sprint, milestone, deliverable, CR, team, settings: lead & stakeholder. */
export function canManageProject(user: User, p: Project): boolean {
  if (p.archived && user.role !== "stakeholder") return false;
  return user.role === "stakeholder" || projectRole(user, p) === "lead";
}

export function canDeleteProject(user: User): boolean {
  return user.role === "stakeholder";
}

/** Progress (%) dihitung dari task yang ada di kolom "selesai". */
export function projectProgress(projectId: string, tasks: Task[], columns: BoardColumn[]): number {
  const own = tasks.filter((t) => t.projectId === projectId);
  return progressOf(own, doneColumnIds(columns.filter((c) => c.projectId === projectId))).percent;
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
