"use client";

import { useMemo } from "react";
import { doneColumnIds } from "@/lib/calc/project";
import { useAuthed } from "@/store/app-provider";
import type { MultiOption } from "../ui/multi-select";
import { useProject } from "./workspace/context";

/** Data project aktif yang sudah difilter & disiapkan untuk komponen workspace. */
export function useProjectData() {
  const { state } = useAuthed();
  const { project } = useProject();
  return useMemo(() => {
    const pid = project.id;
    const boards = state.boards.filter((b) => b.projectId === pid).sort((a, b) => a.order - b.order);
    const columns = state.boardColumns.filter((c) => c.projectId === pid).sort((a, b) => a.order - b.order);
    const tasks = state.tasks.filter((t) => t.projectId === pid);
    const epics = state.epics.filter((e) => e.projectId === pid);
    const epicIds = new Set(epics.map((e) => e.id));
    const stories = state.stories.filter((s) => epicIds.has(s.epicId));
    const sprints = state.sprints.filter((s) => s.projectId === pid).sort((a, b) => a.startDate.localeCompare(b.startDate));
    const doneCols = doneColumnIds(columns);
    const members = project.memberIds.map((id) => state.users.find((u) => u.id === id)).filter((u) => u !== undefined);
    const memberOptions: MultiOption[] = members.map((u) => ({ value: u.id, label: u.name, hint: project.members.find((m) => m.userId === u.id)?.role }));
    const labelOptions: MultiOption[] = project.labels.map((l) => ({ value: l.id, label: l.name, color: l.color }));
    const storyEpic = new Map(stories.map((s) => [s.id, s.epicId]));
    return {
      boards,
      columns,
      tasks,
      epics,
      stories,
      sprints,
      doneCols,
      members,
      memberOptions,
      labelOptions,
      storyEpic,
      columnById: new Map(columns.map((c) => [c.id, c])),
      taskById: new Map(tasks.map((t) => [t.id, t])),
      labelById: new Map(project.labels.map((l) => [l.id, l])),
      epicById: new Map(epics.map((e) => [e.id, e])),
      storyById: new Map(stories.map((s) => [s.id, s])),
    };
  }, [state, project]);
}

export type ProjectData = ReturnType<typeof useProjectData>;
