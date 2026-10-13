/** Aksi epic & story (kelola: lead/stakeholder). */
import type { Actor } from "@/lib/calc/approval";
import type { Epic, Story } from "@/lib/project-types";
import { ActionError } from "./actions";
import { assertManage, replaceById, withActivity } from "./project-core";
import { newId, type DataState } from "./state";

function getEpic(s: DataState, epicId: string): Epic {
  const e = s.epics.find((x) => x.id === epicId);
  if (!e) throw new ActionError("Epic tidak ditemukan.");
  return e;
}

export function saveEpic(s: DataState, projectId: string, epic: Pick<Epic, "title" | "description" | "color"> & { id?: string }, actor: Actor, at: string): DataState {
  assertManage(s, projectId, actor);
  if (!epic.title.trim()) throw new ActionError("Judul epic wajib diisi.");
  if (epic.id) {
    const next: DataState = { ...s, epics: replaceById(s.epics, epic.id, (e) => ({ ...e, ...epic, title: epic.title.trim() })) };
    return withActivity(next, projectId, actor.id, at, "board", `Epic diperbarui: ${epic.title.trim()}`);
  }
  const created: Epic = { id: newId("epic"), projectId, title: epic.title.trim(), description: epic.description, color: epic.color };
  return withActivity({ ...s, epics: [...s.epics, created] }, projectId, actor.id, at, "board", `Epic dibuat: ${created.title}`);
}

/** Hapus epic beserta story-nya; task yang tertaut dilepas dari story. */
export function deleteEpic(s: DataState, epicId: string, actor: Actor, at: string): DataState {
  const epic = getEpic(s, epicId);
  assertManage(s, epic.projectId, actor);
  const storyIds = new Set(s.stories.filter((x) => x.epicId === epicId).map((x) => x.id));
  const next: DataState = {
    ...s,
    epics: s.epics.filter((e) => e.id !== epicId),
    stories: s.stories.filter((x) => x.epicId !== epicId),
    tasks: s.tasks.map((t) => (t.storyId && storyIds.has(t.storyId) ? { ...t, storyId: null } : t)),
  };
  return withActivity(next, epic.projectId, actor.id, at, "board", `Epic dihapus: ${epic.title}`);
}

export function saveStory(s: DataState, story: Pick<Story, "epicId" | "title"> & { id?: string }, actor: Actor, at: string): DataState {
  const epic = getEpic(s, story.epicId);
  assertManage(s, epic.projectId, actor);
  if (!story.title.trim()) throw new ActionError("Judul story wajib diisi.");
  if (story.id) {
    const next: DataState = { ...s, stories: replaceById(s.stories, story.id, (x) => ({ ...x, title: story.title.trim() })) };
    return withActivity(next, epic.projectId, actor.id, at, "board", `Story diperbarui: ${story.title.trim()}`);
  }
  const created: Story = { id: newId("story"), epicId: story.epicId, title: story.title.trim() };
  return withActivity({ ...s, stories: [...s.stories, created] }, epic.projectId, actor.id, at, "board", `Story dibuat: ${created.title}`);
}

export function deleteStory(s: DataState, storyId: string, actor: Actor, at: string): DataState {
  const story = s.stories.find((x) => x.id === storyId);
  if (!story) throw new ActionError("Story tidak ditemukan.");
  const epic = getEpic(s, story.epicId);
  assertManage(s, epic.projectId, actor);
  const next: DataState = {
    ...s,
    stories: s.stories.filter((x) => x.id !== storyId),
    tasks: s.tasks.map((t) => (t.storyId === storyId ? { ...t, storyId: null } : t)),
  };
  return withActivity(next, epic.projectId, actor.id, at, "board", `Story dihapus: ${story.title}`);
}
