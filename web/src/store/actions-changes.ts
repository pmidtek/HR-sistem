/** Aksi Change Request. Ajukan/edit: member; keputusan & status: lead/stakeholder. */
import type { Actor } from "@/lib/calc/approval";
import { addDays } from "@/lib/calc/dates";
import { canTransitionCr, nextNumber, refLabel } from "@/lib/calc/project";
import type { ChangeRequest, ChangeStatus } from "@/lib/project-types";
import { ActionError } from "./actions";
import { createTask } from "./actions-tasks";
import { assertEdit, assertManage, replaceById, withActivity, withNotify } from "./project-core";
import { newId, type DataState } from "./state";

export const crStatusLabel: Record<ChangeStatus, string> = {
  submitted: "Diajukan", under_review: "Direview", approved: "Disetujui", rejected: "Ditolak", implemented: "Diimplementasikan",
};

export type CrInput = Pick<ChangeRequest, "title" | "description" | "source" | "requestedBy" | "requestedAt" | "impactDays" | "impactNote" | "estimateHours"> & { id?: string };

function validate(input: CrInput) {
  if (!input.title.trim() || !input.description.trim() || !input.requestedBy.trim()) throw new ActionError("Judul, deskripsi, dan peminta wajib diisi.");
  if (input.impactDays < 0) throw new ActionError("Dampak hari tidak boleh negatif.");
}

export function saveCr(s: DataState, projectId: string, input: CrInput, actor: Actor, at: string): DataState {
  const p = assertEdit(s, projectId, actor);
  validate(input);
  if (input.id) {
    const old = s.changeRequests.find((c) => c.id === input.id);
    if (!old) throw new ActionError("CR tidak ditemukan.");
    if (old.status !== "submitted" && old.status !== "under_review") throw new ActionError("CR yang sudah diputuskan tidak bisa diubah.");
    const next: DataState = { ...s, changeRequests: replaceById(s.changeRequests, input.id, (c) => ({ ...c, ...input, title: input.title.trim() })) };
    return withActivity(next, projectId, actor.id, at, "cr", `CR diperbarui: ${input.title.trim()}`, refLabel("CR", old.number));
  }
  const number = nextNumber(s.changeRequests.filter((c) => c.projectId === projectId).map((c) => c.number));
  const cr: ChangeRequest = { ...input, title: input.title.trim(), id: newId("cr"), projectId, number, status: "submitted", decidedById: null, decidedAt: null, linkedTaskIds: [] };
  let next = withActivity({ ...s, changeRequests: [...s.changeRequests, cr] }, projectId, actor.id, at, "cr", `CR diajukan: ${cr.title}`, refLabel("CR", number));
  // Lead perlu tahu ada CR baru untuk direview.
  next = withNotify(next, p.members.filter((m) => m.role === "lead").map((m) => m.userId), actor.id, "Change request baru", `${refLabel("CR", number)} ${cr.title}`, `/projects/${projectId}/changes`, at);
  return next;
}

export type ApproveOptions = { createTaskBoardId?: string; shiftTarget?: boolean; taskId?: string };

/** Ubah status CR sesuai alur. Saat disetujui: opsi buat task & geser target project +n hari. */
export function transitionCr(s: DataState, crId: string, to: ChangeStatus, actor: Actor, at: string, opts: ApproveOptions = {}): DataState {
  const cr = s.changeRequests.find((c) => c.id === crId);
  if (!cr) throw new ActionError("CR tidak ditemukan.");
  const project = assertManage(s, cr.projectId, actor);
  if (!canTransitionCr(cr.status, to)) throw new ActionError(`Status ${crStatusLabel[cr.status]} tidak bisa menjadi ${crStatusLabel[to]}.`);
  const ref = refLabel("CR", cr.number);
  const decided = to === "approved" || to === "rejected";
  let next: DataState = {
    ...s,
    changeRequests: replaceById(s.changeRequests, crId, (c) => ({ ...c, status: to, decidedById: decided ? actor.id : c.decidedById, decidedAt: decided ? at.slice(0, 10) : c.decidedAt })),
  };
  next = withActivity(next, cr.projectId, actor.id, at, "cr_status", `CR ${crStatusLabel[to].toLowerCase()}`, ref);
  if (to === "approved") {
    if (opts.createTaskBoardId) {
      const column = s.boardColumns.filter((c) => c.boardId === opts.createTaskBoardId).sort((a, b) => a.order - b.order)[0];
      if (!column) throw new ActionError("Board tujuan tidak punya kolom.");
      const taskId = opts.taskId ?? newId("task");
      next = createTask(next, {
        projectId: cr.projectId, boardId: column.boardId, columnId: column.id, title: `[${ref}] ${cr.title}`,
        description: cr.description, estimateHours: cr.estimateHours,
      }, actor, at, taskId);
      next = { ...next, changeRequests: replaceById(next.changeRequests, crId, (c) => ({ ...c, linkedTaskIds: [...c.linkedTaskIds, taskId] })) };
    }
    if (opts.shiftTarget && cr.impactDays > 0) {
      const newTarget = addDays(project.targetDate, cr.impactDays);
      next = { ...next, projects: replaceById(next.projects, project.id, (p) => ({ ...p, targetDate: newTarget })) };
      next = withActivity(next, cr.projectId, actor.id, at, "settings", `Target selesai digeser +${cr.impactDays} hari karena ${ref}`, ref);
    }
  }
  return next;
}
