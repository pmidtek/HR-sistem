/** Aksi Files: catatan, decision register, tautan (member, lead, stakeholder). */
import type { Actor } from "@/lib/calc/approval";
import { nextNumber, refLabel } from "@/lib/calc/project";
import type { Decision, Note, ProjectLink } from "@/lib/project-types";
import { ActionError } from "./actions";
import { assertEdit, replaceById, withActivity } from "./project-core";
import { newId, type DataState } from "./state";

export type NoteInput = Pick<Note, "title" | "body" | "tags" | "pinned"> & { id?: string };

export function saveNote(s: DataState, projectId: string, input: NoteInput, actor: Actor, at: string, id: string = newId("note")): DataState {
  assertEdit(s, projectId, actor);
  const title = input.title.trim() || "Catatan tanpa judul";
  const tags = [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (input.id) {
    const next: DataState = { ...s, notes: replaceById(s.notes, input.id, (n) => ({ ...n, ...input, title, tags, updatedAt: at })) };
    return withActivity(next, projectId, actor.id, at, "note", `Catatan diperbarui: ${title}`);
  }
  const note: Note = { ...input, id, projectId, title, tags, authorId: actor.id, updatedAt: at };
  return withActivity({ ...s, notes: [note, ...s.notes] }, projectId, actor.id, at, "note", `Catatan dibuat: ${title}`);
}

export function deleteNote(s: DataState, noteId: string, actor: Actor, at: string): DataState {
  const note = s.notes.find((n) => n.id === noteId);
  if (!note) throw new ActionError("Catatan tidak ditemukan.");
  assertEdit(s, note.projectId, actor);
  return withActivity({ ...s, notes: s.notes.filter((n) => n.id !== noteId) }, note.projectId, actor.id, at, "note", `Catatan dihapus: ${note.title}`);
}

export type DecisionInput = Omit<Decision, "id" | "projectId" | "number"> & { id?: string };

/**
 * Simpan keputusan. Nomor DR otomatis. Jika `supersedesId` diisi, keputusan lama
 * otomatis berstatus "superseded".
 */
export function saveDecision(s: DataState, projectId: string, input: DecisionInput, actor: Actor, at: string): DataState {
  assertEdit(s, projectId, actor);
  if (!input.title.trim()) throw new ActionError("Judul keputusan wajib diisi.");
  if (input.supersedesId && input.supersedesId === input.id) throw new ActionError("Keputusan tidak bisa menggantikan dirinya sendiri.");
  const own = s.decisions.filter((d) => d.projectId === projectId);
  let decisions: Decision[];
  let number: number;
  if (input.id) {
    number = own.find((d) => d.id === input.id)?.number ?? 0;
    decisions = replaceById(s.decisions, input.id, (d) => ({ ...d, ...input, title: input.title.trim() }));
  } else {
    number = nextNumber(own.map((d) => d.number));
    decisions = [...s.decisions, { ...input, id: newId("dr"), projectId, number, title: input.title.trim() }];
  }
  if (input.supersedesId) decisions = replaceById(decisions, input.supersedesId, (d) => ({ ...d, status: "superseded" }));
  return withActivity({ ...s, decisions }, projectId, actor.id, at, "decision", `${input.id ? "Keputusan diperbarui" : "Keputusan dicatat"}: ${input.title.trim()}`, refLabel("DR", number));
}

export function deleteDecision(s: DataState, decisionId: string, actor: Actor, at: string): DataState {
  const d = s.decisions.find((x) => x.id === decisionId);
  if (!d) throw new ActionError("Keputusan tidak ditemukan.");
  assertEdit(s, d.projectId, actor);
  const next: DataState = {
    ...s,
    decisions: s.decisions.filter((x) => x.id !== decisionId).map((x) => (x.supersedesId === decisionId ? { ...x, supersedesId: null } : x)),
  };
  return withActivity(next, d.projectId, actor.id, at, "decision", `Keputusan dihapus: ${d.title}`, refLabel("DR", d.number));
}

export type LinkInput = Pick<ProjectLink, "label" | "url" | "category"> & { id?: string };

export function saveLink(s: DataState, projectId: string, input: LinkInput, actor: Actor, at: string): DataState {
  assertEdit(s, projectId, actor);
  if (!input.label.trim()) throw new ActionError("Label tautan wajib diisi.");
  if (!/^https?:\/\/\S+$/.test(input.url.trim())) throw new ActionError("URL harus diawali http:// atau https://");
  const clean = { ...input, label: input.label.trim(), url: input.url.trim() };
  if (input.id) {
    const next: DataState = { ...s, projectLinks: replaceById(s.projectLinks, input.id, (l) => ({ ...l, ...clean })) };
    return withActivity(next, projectId, actor.id, at, "link", `Tautan diperbarui: ${clean.label}`);
  }
  const link: ProjectLink = { ...clean, id: newId("lnk"), projectId, addedBy: actor.id };
  return withActivity({ ...s, projectLinks: [...s.projectLinks, link] }, projectId, actor.id, at, "link", `Tautan ditambahkan: ${clean.label}`);
}

export function deleteLink(s: DataState, linkId: string, actor: Actor, at: string): DataState {
  const l = s.projectLinks.find((x) => x.id === linkId);
  if (!l) throw new ActionError("Tautan tidak ditemukan.");
  assertEdit(s, l.projectId, actor);
  const next: DataState = {
    ...s,
    projectLinks: s.projectLinks.filter((x) => x.id !== linkId),
    projects: s.projects.map((p) => (p.id === l.projectId ? { ...p, quickLinkIds: p.quickLinkIds.filter((id) => id !== linkId) } : p)),
  };
  return withActivity(next, l.projectId, actor.id, at, "link", `Tautan dihapus: ${l.label}`);
}
