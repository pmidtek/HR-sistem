"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ActivityPanel } from "@/components/projects/overview/activity-panel";
import { AgendaCard, AttentionList, BoardProgress, WorkloadCard } from "@/components/projects/overview/overview-sections";
import { StatusStrip } from "@/components/projects/overview/status-strip";
import { TaskRegister } from "@/components/projects/overview/task-register";
import { useProjectData } from "@/components/projects/use-project-data";
import { useProject } from "@/components/projects/workspace/context";
import { Icon } from "@/components/ui/icon";
import { CountUpScope, FadeIn } from "@/components/ui/motion";

const FOLD_KEY = "project-overview-summary-open";

function readOpen(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(FOLD_KEY) !== "0";
}

export default function ProjectOverviewPage() {
  const { project } = useProject();
  const data = useProjectData();
  // Status lipat "Ringkasan Lintas Board" disimpan di localStorage.
  const [open, setOpen] = useState(readOpen);
  const toggle = () => {
    setOpen((o) => {
      window.localStorage.setItem(FOLD_KEY, o ? "0" : "1");
      return !o;
    });
  };

  return (
    <CountUpScope id={`project-${project.id}`}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {project.description && <p className="max-w-3xl text-sm text-fg-muted">{project.description}</p>}
          <StatusStrip data={data} />
          <section className="flex flex-col gap-4">
            <button type="button" onClick={toggle} aria-expanded={open} className="flex w-fit items-center gap-2 text-sm text-fg-muted hover:text-fg">
              <Icon icon={ChevronRight} size={14} className={cn("transition-transform duration-[200ms]", open && "rotate-90")} />
              Ringkasan Lintas Board
            </button>
            {open && (
              <FadeIn className="flex flex-col gap-4">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 2xl:grid-cols-2">
                  <AttentionList data={data} />
                  <AgendaCard data={data} />
                  <BoardProgress data={data} />
                  <WorkloadCard data={data} />
                </div>
                <TaskRegister data={data} />
              </FadeIn>
            )}
          </section>
        </div>
        <ActivityPanel data={data} />
      </div>
    </CountUpScope>
  );
}
