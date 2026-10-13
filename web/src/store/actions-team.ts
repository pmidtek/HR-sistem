/** Aksi Team: anggota & peran, permintaan bergabung, link undangan (lead/stakeholder). */
import type { Actor } from "@/lib/calc/approval";
import { addDays } from "@/lib/calc/dates";
import type { InviteLink, ProjectRole } from "@/lib/project-types";
import { syncMembers } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { ActionError } from "./actions";
import { assertManage, replaceById, withActivity, withNotify } from "./project-core";
import { newId, type DataState } from "./state";

export const roleLabel: Record<ProjectRole, string> = { lead: "Lead", member: "Member", viewer: "Viewer" };

function withMembers(s: DataState, projectId: string, update: (p: Project) => Project["members"]): DataState {
  return { ...s, projects: replaceById(s.projects, projectId, (p) => syncMembers({ ...p, members: update(p) })) };
}

const nameOf = (s: DataState, id: string) => s.users.find((u) => u.id === id)?.name ?? id;

export function addMember(s: DataState, projectId: string, userId: string, role: ProjectRole, actor: Actor, today: string, at: string): DataState {
  const p = assertManage(s, projectId, actor);
  if (!s.users.some((u) => u.id === userId && u.active)) throw new ActionError("Pegawai tidak ditemukan atau tidak aktif.");
  if (p.memberIds.includes(userId)) throw new ActionError("Pegawai ini sudah menjadi anggota.");
  let next = withMembers(s, projectId, (x) => [...x.members, { userId, role, joinedAt: today }]);
  next = { ...next, joinRequests: next.joinRequests.filter((j) => !(j.projectId === projectId && j.userId === userId)) };
  next = withActivity(next, projectId, actor.id, at, "member_added", `${nameOf(s, userId)} ditambahkan sebagai ${roleLabel[role]}`);
  return withNotify(next, [userId], actor.id, "Ditambahkan ke project", `Anda ditambahkan ke ${p.code} — ${p.name} sebagai ${roleLabel[role]}.`, `/projects/${projectId}`, at);
}

function assertKeepsLead(p: Project, userId: string, newRole: ProjectRole | null) {
  const leads = p.members.filter((m) => m.role === "lead");
  const isLead = leads.some((m) => m.userId === userId);
  if (isLead && leads.length === 1 && newRole !== "lead") throw new ActionError("Project harus punya minimal satu Lead.");
}

export function changeMemberRole(s: DataState, projectId: string, userId: string, role: ProjectRole, actor: Actor, at: string): DataState {
  const p = assertManage(s, projectId, actor);
  if (!p.memberIds.includes(userId)) throw new ActionError("Bukan anggota project.");
  assertKeepsLead(p, userId, role);
  const next = withMembers(s, projectId, (x) => x.members.map((m) => (m.userId === userId ? { ...m, role } : m)));
  return withActivity(next, projectId, actor.id, at, "member", `Peran ${nameOf(s, userId)} diubah menjadi ${roleLabel[role]}`);
}

/** Keluarkan anggota; task yang di-assign ke dia dilepas. Lead terakhir tidak bisa dikeluarkan. */
export function removeMember(s: DataState, projectId: string, userId: string, actor: Actor, at: string): DataState {
  const p = assertManage(s, projectId, actor);
  if (!p.memberIds.includes(userId)) throw new ActionError("Bukan anggota project.");
  assertKeepsLead(p, userId, null);
  let next = withMembers(s, projectId, (x) => x.members.filter((m) => m.userId !== userId));
  next = { ...next, tasks: next.tasks.map((t) => (t.projectId === projectId && t.assigneeIds.includes(userId) ? { ...t, assigneeIds: t.assigneeIds.filter((a) => a !== userId) } : t)) };
  return withActivity(next, projectId, actor.id, at, "member", `${nameOf(s, userId)} dikeluarkan dari project`);
}

export function answerJoinRequest(s: DataState, requestId: string, accept: boolean, actor: Actor, today: string, at: string): DataState {
  const req = s.joinRequests.find((j) => j.id === requestId);
  if (!req) throw new ActionError("Permintaan tidak ditemukan.");
  assertManage(s, req.projectId, actor);
  if (accept) return addMember(s, req.projectId, req.userId, "member", actor, today, at);
  const next: DataState = { ...s, joinRequests: s.joinRequests.filter((j) => j.id !== requestId) };
  const p = s.projects.find((x) => x.id === req.projectId);
  return withNotify(
    withActivity(next, req.projectId, actor.id, at, "member", `Permintaan bergabung ${nameOf(s, req.userId)} ditolak`),
    [req.userId], actor.id, "Permintaan bergabung ditolak", `${p?.code ?? ""} — ${p?.name ?? ""}`, "/projects", at,
  );
}

/** Link undangan (simulasi token) dengan masa berlaku 1/7/30 hari. */
export function createInviteLink(s: DataState, projectId: string, days: 1 | 7 | 30, actor: Actor, today: string, at: string, token: string): DataState {
  assertManage(s, projectId, actor);
  const link: InviteLink = { id: newId("inv"), projectId, token, createdBy: actor.id, expiresAt: addDays(today, days) };
  return withActivity({ ...s, inviteLinks: [link, ...s.inviteLinks] }, projectId, actor.id, at, "member", `Link undangan dibuat (berlaku ${days} hari)`);
}

export function revokeInviteLink(s: DataState, linkId: string, actor: Actor, at: string): DataState {
  const link = s.inviteLinks.find((l) => l.id === linkId);
  if (!link) throw new ActionError("Link tidak ditemukan.");
  assertManage(s, link.projectId, actor);
  return withActivity({ ...s, inviteLinks: s.inviteLinks.filter((l) => l.id !== linkId) }, link.projectId, actor.id, at, "member", "Link undangan dicabut");
}
