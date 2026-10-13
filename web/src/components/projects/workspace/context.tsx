"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ProjectRole } from "@/lib/project-types";
import type { Project } from "@/lib/types";

export type ProjectWorkspace = {
  project: Project;
  role: ProjectRole | null;
  /** Buat/edit task, komentar, catatan, MOM, tautan. */
  canEdit: boolean;
  /** Kelola board, kolom, epic, sprint, milestone, deliverable, CR, team, settings. */
  canManage: boolean;
  canDelete: boolean;
  /** "/projects/<id>" */
  base: string;
};

const Ctx = createContext<ProjectWorkspace | null>(null);

export function ProjectWorkspaceProvider({ value, children }: { value: ProjectWorkspace; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Data project aktif + hak akses; hanya dipakai di dalam /projects/[id]. */
export function useProject(): ProjectWorkspace {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProject harus dipakai di dalam layout project");
  return ctx;
}
