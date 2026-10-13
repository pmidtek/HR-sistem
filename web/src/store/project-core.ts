/** Utilitas bersama aksi project: cek akses (simulasi server), activity log, cap waktu. */
import type { Actor } from "@/lib/calc/approval";
import { canEditProject, canManageProject } from "@/lib/projects";
import type { ActivityKind } from "@/lib/project-types";
import type { Project } from "@/lib/types";
import { ActionError } from "./actions";
import { newId, type DataState } from "./state";

/** Cap waktu: tanggal "hari ini" aplikasi (dummy) + jam sekarang Asia/Jakarta. */
export function stamp(today: string): string {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
  return `${today}T${time}+07:00`;
}

export function getProject(s: DataState, projectId: string): Project {
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) throw new ActionError("Project tidak ditemukan.");
  return p;
}

function userOf(s: DataState, actor: Actor) {
  const u = s.users.find((x) => x.id === actor.id);
  if (!u) throw new ActionError("User tidak dikenal.");
  return u;
}

export function assertEdit(s: DataState, projectId: string, actor: Actor): Project {
  const p = getProject(s, projectId);
  if (!canEditProject(userOf(s, actor), p)) throw new ActionError("Anda hanya bisa melihat project ini.");
  return p;
}

export function assertManage(s: DataState, projectId: string, actor: Actor): Project {
  const p = getProject(s, projectId);
  if (!canManageProject(userOf(s, actor), p)) throw new ActionError("Hanya lead project atau stakeholder yang bisa melakukan ini.");
  return p;
}

/** Tambah satu baris activity (terbaru di depan). Wajib dipanggil di setiap aksi yang mengubah project. */
export function withActivity(
  s: DataState,
  projectId: string,
  actorId: string,
  at: string,
  kind: ActivityKind,
  text: string,
  targetRef: string | null = null,
): DataState {
  return { ...s, activityLogs: [{ id: newId("act"), projectId, actorId, at, kind, text, targetRef }, ...s.activityLogs] };
}

/** Kirim notifikasi in-app ke beberapa user (kecuali pelaku). */
export function withNotify(s: DataState, userIds: string[], actorId: string, title: string, body: string, href: string, at: string): DataState {
  const created = [...new Set(userIds)]
    .filter((id) => id !== actorId)
    .map((userId) => ({ id: newId("n"), userId, title, body, href, createdAt: at, read: false }));
  return created.length ? { ...s, notifications: [...created, ...s.notifications] } : s;
}

export function replaceById<T extends { id: string }>(list: T[], id: string, update: (item: T) => T): T[] {
  return list.map((x) => (x.id === id ? update(x) : x));
}
