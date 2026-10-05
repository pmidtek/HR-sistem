"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { canSeeProject, isLate, projectProgress } from "@/lib/projects";
import { useAuthed } from "@/store/app-provider";
import { useLookups } from "@/components/hooks";
import { CreateProjectDialog } from "@/components/sales/create-project-dialog";
import { PageHeader } from "@/components/shell/page-header";
import { ProjectBadge } from "@/components/status-badge";
import { MyTasks } from "@/components/projects/my-tasks";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";

export default function ProjectsPage() {
  const { state, user, today } = useAuthed();
  const { teamName, userName } = useLookups();
  const [view, setView] = useState<"projects" | "mine">("projects");
  const [creating, setCreating] = useState(false);
  const visible = state.projects.filter((p) => canSeeProject(user, p));

  return (
    <>
      <PageHeader
        title="Project"
        accent="yang berjalan."
        description="Kode PRYYXXXX dari setiap project langsung bisa dipakai di timesheet."
        actions={user.role === "stakeholder" && <Button iconLeft={<Icon icon={Plus} />} onClick={() => setCreating(true)}>Project internal</Button>}
      />
      <div className="mb-6">
        <Tabs value={view} onChange={setView} tabs={[{ value: "projects", label: "Semua project", count: visible.length }, { value: "mine", label: "Task Saya" }]} />
      </div>

      {view === "mine" ? <MyTasks /> : visible.length === 0 ? (
        <EmptyState title="Belum ada project" description="Anda akan melihat project di sini setelah ditambahkan sebagai anggota." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => {
            const progress = projectProgress(p.id, state.tasks, state.boardColumns);
            const late = isLate(p, today);
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card interactive className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] text-fg-brand">{p.code}</span>
                    <div className="flex gap-1.5">
                      {late && <Badge tone="danger">Terlambat</Badge>}
                      <ProjectBadge status={p.status} />
                    </div>
                  </div>
                  <div>
                    <p className="font-display text-lg font-medium leading-snug">{p.name}</p>
                    <p className="mt-1 text-xs text-fg-muted">{p.teamIds.map(teamName).join(" · ")}</p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-fg-muted">Progress</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <span className="h-1.5 overflow-hidden rounded-pill bg-hover">
                      <span className={cn("block h-full rounded-pill", late ? "bg-danger" : "bg-brand")} style={{ width: `${progress}%` }} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-3">
                    <div className="flex -space-x-1.5">
                      {p.memberIds.slice(0, 5).map((m) => <Avatar key={m} name={userName(m)} size="small" color={m === p.leadId ? "brand" : "neutral"} />)}
                    </div>
                    <span className="font-mono text-[11px] text-fg-subtle">Target {formatDate(p.targetDate)}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      {creating && <CreateProjectDialog opportunity={null} onClose={() => setCreating(false)} />}
    </>
  );
}
