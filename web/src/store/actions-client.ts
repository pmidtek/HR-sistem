/** Aksi menu Client: touchpoint, key action, peran stakeholder klien (member, lead, stakeholder). */
import type { Actor } from "@/lib/calc/approval";
import type { ClientContactRole, ClientKeyAction, ClientTouchpoint } from "@/lib/project-types";
import { ActionError } from "./actions";
import { assertEdit, replaceById, withActivity } from "./project-core";
import { newId, type DataState } from "./state";

export type TouchpointInput = Omit<ClientTouchpoint, "id" | "projectId"> & { id?: string };

export function saveTouchpoint(s: DataState, projectId: string, input: TouchpointInput, actor: Actor, at: string): DataState {
  assertEdit(s, projectId, actor);
  if (!input.summary.trim()) throw new ActionError("Ringkasan interaksi wajib diisi.");
  if (!input.date) throw new ActionError("Tanggal wajib diisi.");
  if (input.id) {
    const next: DataState = { ...s, touchpoints: replaceById(s.touchpoints, input.id, (t) => ({ ...t, ...input })) };
    return withActivity(next, projectId, actor.id, at, "client", `Interaksi klien diperbarui: ${input.summary}`);
  }
  const tp: ClientTouchpoint = { ...input, id: newId("tp"), projectId };
  return withActivity({ ...s, touchpoints: [...s.touchpoints, tp] }, projectId, actor.id, at, "client", `Interaksi klien dicatat: ${input.summary}`);
}

export function deleteTouchpoint(s: DataState, id: string, actor: Actor, at: string): DataState {
  const tp = s.touchpoints.find((t) => t.id === id);
  if (!tp) throw new ActionError("Interaksi tidak ditemukan.");
  assertEdit(s, tp.projectId, actor);
  return withActivity({ ...s, touchpoints: s.touchpoints.filter((t) => t.id !== id) }, tp.projectId, actor.id, at, "client", `Interaksi klien dihapus: ${tp.summary}`);
}

export type KeyActionInput = Omit<ClientKeyAction, "id" | "projectId"> & { id?: string };

export function saveKeyAction(s: DataState, projectId: string, input: KeyActionInput, actor: Actor, at: string): DataState {
  assertEdit(s, projectId, actor);
  if (!input.title.trim()) throw new ActionError("Judul tindak lanjut wajib diisi.");
  if (input.id) {
    const old = s.keyActions.find((k) => k.id === input.id);
    const next: DataState = { ...s, keyActions: replaceById(s.keyActions, input.id, (k) => ({ ...k, ...input, title: input.title.trim() })) };
    const text = old && old.status !== input.status ? `Tindak lanjut klien ${input.status === "done" ? "selesai" : "dibuka lagi"}: ${input.title}` : `Tindak lanjut klien diperbarui: ${input.title}`;
    return withActivity(next, projectId, actor.id, at, "client", text);
  }
  const ka: ClientKeyAction = { ...input, id: newId("ka"), projectId, title: input.title.trim() };
  return withActivity({ ...s, keyActions: [...s.keyActions, ka] }, projectId, actor.id, at, "client", `Tindak lanjut klien ditambahkan: ${ka.title}`);
}

export function deleteKeyAction(s: DataState, id: string, actor: Actor, at: string): DataState {
  const ka = s.keyActions.find((k) => k.id === id);
  if (!ka) throw new ActionError("Tindak lanjut tidak ditemukan.");
  assertEdit(s, ka.projectId, actor);
  return withActivity({ ...s, keyActions: s.keyActions.filter((k) => k.id !== id) }, ka.projectId, actor.id, at, "client", `Tindak lanjut klien dihapus: ${ka.title}`);
}

/** Set / hapus (null) peran kontak klien di project. */
export function setContactRole(s: DataState, projectId: string, contactId: string, role: ClientContactRole | null, actor: Actor, at: string): DataState {
  assertEdit(s, projectId, actor);
  const projects = s.projects.map((p) => {
    if (p.id !== projectId) return p;
    const roles = { ...p.clientContactRoles };
    if (role) roles[contactId] = role;
    else delete roles[contactId];
    return { ...p, clientContactRoles: roles };
  });
  return withActivity({ ...s, projects }, projectId, actor.id, at, "client", "Peran stakeholder klien diperbarui");
}
