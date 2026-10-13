/** Aksi Settings project: umum, label, kolom default, tautan cepat, arsip, hapus. */
import type { Actor } from "@/lib/calc/approval";
import type { ProjectLabel } from "@/lib/project-types";
import { syncMembers } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { ActionError } from "./actions";
import { assertManage, getProject, replaceById, withActivity } from "./project-core";
import type { DataState } from "./state";

export type GeneralInput = Pick<Project, "name" | "description" | "teamIds" | "startDate" | "targetDate" | "status" | "color" | "companyId"> & { leadId: string };

export function updateGeneral(s: DataState, projectId: string, input: GeneralInput, actor: Actor, at: string): DataState {
  const p = assertManage(s, projectId, actor);
  if (!input.name.trim()) throw new ActionError("Nama project wajib diisi.");
  if (input.targetDate < input.startDate) throw new ActionError("Target selesai harus setelah tanggal mulai.");
  if (input.teamIds.length === 0) throw new ActionError("Pilih minimal satu tim pelaksana.");
  if (!p.memberIds.includes(input.leadId)) throw new ActionError("Lead harus anggota project.");
  // Lead baru otomatis berperan "lead"; lead lama tetap anggota sebagai member.
  const members = p.members.map((m) => (m.userId === input.leadId ? { ...m, role: "lead" as const } : m.userId === p.leadId && m.role === "lead" && input.leadId !== p.leadId ? { ...m, role: "member" as const } : m));
  const next: DataState = {
    ...s,
    projects: replaceById(s.projects, projectId, (x) => syncMembers({
      ...x, name: input.name.trim(), description: input.description, teamIds: input.teamIds, startDate: input.startDate,
      targetDate: input.targetDate, status: input.status, color: input.color, companyId: input.companyId, members,
    })),
  };
  return withActivity(next, projectId, actor.id, at, "settings", "Pengaturan umum project diperbarui");
}

/** Simpan label. Label yang dihapus otomatis dilepas dari semua task. */
export function saveLabels(s: DataState, projectId: string, labels: ProjectLabel[], actor: Actor, at: string): DataState {
  assertManage(s, projectId, actor);
  const clean = labels.map((l) => ({ ...l, name: l.name.trim().toLowerCase() })).filter((l) => l.name);
  if (new Set(clean.map((l) => l.name)).size !== clean.length) throw new ActionError("Nama label tidak boleh sama.");
  const keep = new Set(clean.map((l) => l.id));
  const next: DataState = {
    ...s,
    projects: replaceById(s.projects, projectId, (p) => ({ ...p, labels: clean })),
    tasks: s.tasks.map((t) => (t.projectId === projectId ? { ...t, labels: t.labels.filter((id) => keep.has(id)) } : t)),
  };
  return withActivity(next, projectId, actor.id, at, "settings", "Label project diperbarui");
}

export function saveDefaultColumns(s: DataState, projectId: string, columns: string[], actor: Actor, at: string): DataState {
  assertManage(s, projectId, actor);
  const clean = columns.map((c) => c.trim()).filter(Boolean);
  if (clean.length < 2) throw new ActionError("Minimal dua kolom (kolom terakhir dianggap selesai).");
  const next: DataState = { ...s, projects: replaceById(s.projects, projectId, (p) => ({ ...p, defaultColumns: clean })) };
  return withActivity(next, projectId, actor.id, at, "settings", "Kolom default board diperbarui");
}

export function setQuickLinks(s: DataState, projectId: string, linkIds: string[], actor: Actor, at: string): DataState {
  assertManage(s, projectId, actor);
  if (linkIds.length > 3) throw new ActionError("Tautan cepat maksimal 3.");
  const next: DataState = { ...s, projects: replaceById(s.projects, projectId, (p) => ({ ...p, quickLinkIds: linkIds })) };
  return withActivity(next, projectId, actor.id, at, "settings", "Tautan cepat diperbarui");
}

export function setArchived(s: DataState, projectId: string, archived: boolean, actor: Actor, at: string): DataState {
  assertManage(s, projectId, actor);
  const next: DataState = { ...s, projects: replaceById(s.projects, projectId, (p) => ({ ...p, archived })) };
  return withActivity(next, projectId, actor.id, at, "settings", archived ? "Project diarsipkan" : "Project dipulihkan dari arsip");
}

/** Hapus project beserta seluruh isinya. Hanya stakeholder. */
export function deleteProject(s: DataState, projectId: string, actor: Actor): DataState {
  getProject(s, projectId);
  if (actor.role !== "stakeholder") throw new ActionError("Hanya stakeholder yang bisa menghapus project.");
  const own = <T extends { projectId: string }>(list: T[]) => list.filter((x) => x.projectId !== projectId);
  const epicIds = new Set(s.epics.filter((e) => e.projectId === projectId).map((e) => e.id));
  return {
    ...s,
    projects: s.projects.filter((p) => p.id !== projectId),
    boards: own(s.boards), boardColumns: own(s.boardColumns), tasks: own(s.tasks), epics: own(s.epics),
    stories: s.stories.filter((x) => !epicIds.has(x.epicId)), sprints: own(s.sprints), milestones: own(s.milestones),
    deliverables: own(s.deliverables), moms: own(s.moms), notes: own(s.notes), decisions: own(s.decisions),
    projectLinks: own(s.projectLinks), touchpoints: own(s.touchpoints), keyActions: own(s.keyActions),
    changeRequests: own(s.changeRequests), baselines: own(s.baselines), activityLogs: own(s.activityLogs),
    joinRequests: own(s.joinRequests), inviteLinks: own(s.inviteLinks),
  };
}
