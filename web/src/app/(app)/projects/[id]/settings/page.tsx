"use client";

import { GeneralForm } from "@/components/projects/settings/general-form";
import { ColumnsAndLinksForm, DangerZone, LabelsForm } from "@/components/projects/settings/other-forms";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";
import { EmptyState } from "@/components/ui/display";

export default function ProjectSettingsPage() {
  const { canManage } = useProject();
  if (!canManage) return <EmptyState title="Pengaturan hanya untuk lead project atau stakeholder" />;
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Settings" description="Atur informasi project, label task, kolom default, dan tautan cepat." />
      <GeneralForm />
      <LabelsForm />
      <ColumnsAndLinksForm />
      <DangerZone />
    </div>
  );
}
