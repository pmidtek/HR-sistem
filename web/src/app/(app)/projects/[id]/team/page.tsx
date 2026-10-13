"use client";

import { MembersTable } from "@/components/projects/team/members-table";
import { AddMemberCard, InviteLinksCard, JoinRequestsCard } from "@/components/projects/team/team-manage";
import { useProjectData } from "@/components/projects/use-project-data";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";

export default function TeamPage() {
  const { project, canManage } = useProject();
  const data = useProjectData();
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Team"
        description={`${project.members.length} anggota. Lead & Member bisa mengedit; Viewer hanya melihat.${canManage ? "" : " Hanya lead atau stakeholder yang bisa mengatur anggota."}`}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <MembersTable data={data} />
        {canManage && (
          <div className="flex flex-col gap-4">
            <AddMemberCard />
            <JoinRequestsCard />
            <InviteLinksCard />
          </div>
        )}
      </div>
    </div>
  );
}
