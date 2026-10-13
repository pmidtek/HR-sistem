/** Aksi milestone & deliverable (kelola: lead/stakeholder). Semua tercatat di activity. */
import type { Actor } from "@/lib/calc/approval";
import type { Deliverable, DeliverableStatus, Milestone } from "@/lib/project-types";
import { ActionError } from "./actions";
import { assertManage, replaceById, withActivity } from "./project-core";
import { newId, type DataState } from "./state";

export const deliverableStatusLabel: Record<DeliverableStatus, string> = {
  draft: "Draft",
  in_progress: "Dalam Proses",
  review: "Review",
  sent: "Terkirim",
};

export type MilestoneInput = Pick<Milestone, "name" | "description" | "targetDate" | "taskIds"> & { id?: string };

export function saveMilestone(s: DataState, projectId: string, input: MilestoneInput, actor: Actor, at: string): DataState {
  assertManage(s, projectId, actor);
  if (!input.name.trim()) throw new ActionError("Nama milestone wajib diisi.");
  if (!input.targetDate) throw new ActionError("Target tanggal wajib diisi.");
  if (input.id) {
    const next: DataState = { ...s, milestones: replaceById(s.milestones, input.id, (m) => ({ ...m, ...input, name: input.name.trim() })) };
    return withActivity(next, projectId, actor.id, at, "milestone", `Milestone diperbarui: ${input.name.trim()}`);
  }
  const created: Milestone = { ...input, id: newId("ms"), projectId, name: input.name.trim(), completedAt: null };
  return withActivity({ ...s, milestones: [...s.milestones, created] }, projectId, actor.id, at, "milestone", `Milestone dibuat: ${created.name}`);
}

export function toggleMilestoneDone(s: DataState, milestoneId: string, actor: Actor, at: string): DataState {
  const m = s.milestones.find((x) => x.id === milestoneId);
  if (!m) throw new ActionError("Milestone tidak ditemukan.");
  assertManage(s, m.projectId, actor);
  const done = !m.completedAt;
  const next: DataState = { ...s, milestones: replaceById(s.milestones, milestoneId, (x) => ({ ...x, completedAt: done ? at : null })) };
  return withActivity(next, m.projectId, actor.id, at, done ? "milestone_done" : "milestone", done ? `Milestone tercapai: ${m.name}` : `Milestone dibuka lagi: ${m.name}`);
}

export function deleteMilestone(s: DataState, milestoneId: string, actor: Actor, at: string): DataState {
  const m = s.milestones.find((x) => x.id === milestoneId);
  if (!m) throw new ActionError("Milestone tidak ditemukan.");
  assertManage(s, m.projectId, actor);
  return withActivity({ ...s, milestones: s.milestones.filter((x) => x.id !== milestoneId) }, m.projectId, actor.id, at, "milestone", `Milestone dihapus: ${m.name}`);
}

export type DeliverableInput = Pick<Deliverable, "title" | "description" | "phase" | "status" | "deadline" | "link" | "ownerId"> & { id?: string };

export function saveDeliverable(s: DataState, projectId: string, input: DeliverableInput, actor: Actor, at: string): DataState {
  assertManage(s, projectId, actor);
  if (!input.title.trim()) throw new ActionError("Judul deliverable wajib diisi.");
  if (input.link && !/^https?:\/\//.test(input.link)) throw new ActionError("Link harus diawali http:// atau https://");
  const title = input.title.trim();
  if (input.id) {
    const old = s.deliverables.find((d) => d.id === input.id);
    let next: DataState = { ...s, deliverables: replaceById(s.deliverables, input.id, (d) => ({ ...d, ...input, title })) };
    if (old && old.status !== input.status) {
      next = withActivity(next, projectId, actor.id, at, "deliverable_status", `Deliverable "${title}" → ${deliverableStatusLabel[input.status]}`);
    } else {
      next = withActivity(next, projectId, actor.id, at, "deliverable", `Deliverable diperbarui: ${title}`);
    }
    return next;
  }
  const created: Deliverable = { ...input, title, id: newId("dlv"), projectId, createdAt: at };
  return withActivity({ ...s, deliverables: [...s.deliverables, created] }, projectId, actor.id, at, "deliverable", `Deliverable dibuat: ${title}`);
}

export function setDeliverableStatus(s: DataState, deliverableId: string, status: DeliverableStatus, actor: Actor, at: string): DataState {
  const d = s.deliverables.find((x) => x.id === deliverableId);
  if (!d) throw new ActionError("Deliverable tidak ditemukan.");
  return saveDeliverable(s, d.projectId, { ...d, status }, actor, at);
}

export function deleteDeliverable(s: DataState, deliverableId: string, actor: Actor, at: string): DataState {
  const d = s.deliverables.find((x) => x.id === deliverableId);
  if (!d) throw new ActionError("Deliverable tidak ditemukan.");
  assertManage(s, d.projectId, actor);
  return withActivity({ ...s, deliverables: s.deliverables.filter((x) => x.id !== deliverableId) }, d.projectId, actor.id, at, "deliverable", `Deliverable dihapus: ${d.title}`);
}
