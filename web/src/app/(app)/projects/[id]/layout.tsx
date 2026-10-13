"use client";

import { usePathname } from "next/navigation";
import { use, useMemo } from "react";
import { canDeleteProject, canEditProject, canManageProject, canSeeProject, projectRole } from "@/lib/projects";
import { useAuthed } from "@/store/app-provider";
import { ProjectWorkspaceProvider, type ProjectWorkspace } from "@/components/projects/workspace/context";
import { ProjectHeader } from "@/components/projects/workspace/project-header";
import { ProjectNav } from "@/components/projects/workspace/project-nav";
import { EmptyState } from "@/components/ui/display";
import { PageTransition } from "@/components/ui/motion";

export default function ProjectLayout({ children, params }: LayoutProps<"/projects/[id]">) {
  const { id } = use(params);
  const { state, user } = useAuthed();
  const pathname = usePathname();
  const project = state.projects.find((p) => p.id === id);

  const workspace = useMemo<ProjectWorkspace | null>(() => {
    if (!project || !canSeeProject(user, project)) return null;
    return {
      project,
      role: projectRole(user, project),
      canEdit: canEditProject(user, project),
      canManage: canManageProject(user, project),
      canDelete: canDeleteProject(user),
      base: `/projects/${project.id}`,
    };
  }, [project, user]);

  if (!workspace) return <EmptyState title="Project tidak ditemukan" description="Atau Anda bukan anggota project ini." />;

  return (
    <ProjectWorkspaceProvider value={workspace}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-5 md:grid-cols-[196px_minmax(0,1fr)] print:block">
        <div className="min-w-0 md:col-start-2 print:hidden">
          <ProjectHeader />
        </div>
        <div className="min-w-0 md:col-start-1 md:row-span-2 md:row-start-1 print:hidden">
          <ProjectNav />
        </div>
        <div className="min-w-0 md:col-start-2">
          <PageTransition id={pathname}>{children}</PageTransition>
        </div>
      </div>
    </ProjectWorkspaceProvider>
  );
}
