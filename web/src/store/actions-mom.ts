/** Aksi MOM (Minutes of Meeting). Draft: semua member; published: penulis/lead/stakeholder. */
import type { Actor } from "@/lib/calc/approval";
import { canEditPublished } from "@/lib/projects";
import type { Attachment } from "@/lib/types";
import type { Mom } from "@/lib/project-types";
import { ActionError } from "./actions";
import { createTask } from "./actions-tasks";
import { assertEdit, replaceById, withActivity, withNotify } from "./project-core";
import { newId, type DataState } from "./state";

export type MomPatch = Partial<Pick<Mom, "title" | "meetingDate" | "attendeeIds" | "externalAttendees" | "body" | "actionItems">>;

function getMom(s: DataState, momId: string): Mom {
  const m = s.moms.find((x) => x.id === momId);
  if (!m) throw new ActionError("MOM tidak ditemukan.");
  return m;
}

function assertMomEdit(s: DataState, mom: Mom, actor: Actor) {
  const p = assertEdit(s, mom.projectId, actor);
  const user = s.users.find((u) => u.id === actor.id);
  if (mom.status === "published" && (!user || !canEditPublished(user, p, mom.authorId))) {
    throw new ActionError("MOM yang sudah dipublikasikan hanya bisa diubah penulis atau lead.");
  }
}

/** Buat draft kosong (langsung dibuka di editor). */
export function createMom(s: DataState, projectId: string, actor: Actor, today: string, at: string, id: string = newId("mom")): DataState {
  assertEdit(s, projectId, actor);
  const mom: Mom = {
    id, projectId, title: "MOM baru", meetingDate: today, attendeeIds: [actor.id], externalAttendees: [], body: "## Agenda\n\n## Catatan\n\n## Keputusan\n",
    actionItems: [], attachments: [], status: "draft", authorId: actor.id, updatedAt: at,
  };
  return withActivity({ ...s, moms: [mom, ...s.moms] }, projectId, actor.id, at, "mom", "Draft MOM dibuat");
}

export function saveMom(s: DataState, momId: string, patch: MomPatch, actor: Actor, at: string): DataState {
  const mom = getMom(s, momId);
  assertMomEdit(s, mom, actor);
  if (patch.title !== undefined && !patch.title.trim()) throw new ActionError("Judul MOM wajib diisi.");
  const next: DataState = { ...s, moms: replaceById(s.moms, momId, (m) => ({ ...m, ...patch, updatedAt: at })) };
  return withActivity(next, mom.projectId, actor.id, at, "mom", `MOM diperbarui: ${patch.title ?? mom.title}`);
}

export function publishMom(s: DataState, momId: string, actor: Actor, at: string): DataState {
  const mom = getMom(s, momId);
  assertMomEdit(s, mom, actor);
  if (mom.status === "published") throw new ActionError("MOM sudah dipublikasikan.");
  let next: DataState = { ...s, moms: replaceById(s.moms, momId, (m) => ({ ...m, status: "published", updatedAt: at })) };
  next = withActivity(next, mom.projectId, actor.id, at, "mom_published", `MOM dipublikasikan: ${mom.title}`);
  return withNotify(next, mom.attendeeIds, actor.id, "MOM baru dipublikasikan", mom.title, `/projects/${mom.projectId}/mom/${mom.id}`, at);
}

export function deleteMom(s: DataState, momId: string, actor: Actor, at: string): DataState {
  const mom = getMom(s, momId);
  assertMomEdit(s, mom, actor);
  return withActivity({ ...s, moms: s.moms.filter((m) => m.id !== momId) }, mom.projectId, actor.id, at, "mom", `MOM dihapus: ${mom.title}`);
}

export function addMomAttachment(s: DataState, momId: string, file: Pick<Attachment, "name" | "size">, actor: Actor, at: string): DataState {
  const mom = getMom(s, momId);
  assertMomEdit(s, mom, actor);
  const att: Attachment = { id: newId("att"), name: file.name, size: file.size, url: "#", uploadedBy: actor.id, uploadedAt: at };
  return { ...s, moms: replaceById(s.moms, momId, (m) => ({ ...m, attachments: [...m.attachments, att], updatedAt: at })) };
}

/** "Jadikan task": buat task di kolom pertama board pilihan dan tautkan ke action item. */
export function actionItemToTask(s: DataState, momId: string, itemId: string, boardId: string, actor: Actor, at: string, taskId: string = newId("task")): DataState {
  const mom = getMom(s, momId);
  assertEdit(s, mom.projectId, actor);
  const item = mom.actionItems.find((a) => a.id === itemId);
  if (!item) throw new ActionError("Action item tidak ditemukan.");
  if (item.taskId) throw new ActionError("Action item ini sudah menjadi task.");
  const column = s.boardColumns.filter((c) => c.boardId === boardId).sort((a, b) => a.order - b.order)[0];
  if (!column) throw new ActionError("Board tidak punya kolom.");
  let next = createTask(s, {
    projectId: mom.projectId, boardId, columnId: column.id, title: item.text,
    description: `Dari MOM: ${mom.title} (${mom.meetingDate})`, assigneeIds: item.assigneeId ? [item.assigneeId] : [], deadline: item.dueDate,
  }, actor, at, taskId);
  next = { ...next, moms: replaceById(next.moms, momId, (m) => ({ ...m, actionItems: m.actionItems.map((a) => (a.id === itemId ? { ...a, taskId } : a)) })) };
  return next;
}
