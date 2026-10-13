"use client";

import { DecisionsTab } from "@/components/projects/files/decisions-tab";
import { LinksTab } from "@/components/projects/files/links-tab";
import { NotesTab } from "@/components/projects/files/notes-tab";
import { useQueryParam, useQueryUpdater } from "@/components/projects/use-query-param";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";
import { useAuthed } from "@/store/app-provider";
import { Tabs } from "@/components/ui/tabs";

type Tab = "notes" | "decisions" | "links";
const TABS: Tab[] = ["notes", "decisions", "links"];

export default function FilesPage() {
  const { state } = useAuthed();
  const { project } = useProject();
  const [tabParam] = useQueryParam("tab");
  const updateQuery = useQueryUpdater();
  const [newParam] = useQueryParam("new");
  const tab: Tab = TABS.find((t) => t === tabParam) ?? "notes";
  const count = (list: { projectId: string }[]) => list.filter((x) => x.projectId === project.id).length;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Files" description="Catatan tim, keputusan penting, dan tautan project." />
      <Tabs
        value={tab}
        onChange={(t) => updateQuery({ tab: t, new: null })}
        tabs={[
          { value: "notes", label: "Catatan", count: count(state.notes) },
          { value: "decisions", label: "Decision Register", count: count(state.decisions) },
          { value: "links", label: "Tautan", count: count(state.projectLinks) },
        ]}
      />
      {tab === "notes" && <NotesTab startNew={newParam === "1"} />}
      {tab === "decisions" && <DecisionsTab />}
      {tab === "links" && <LinksTab />}
    </div>
  );
}
