"use client";

import * as Popover from "@radix-ui/react-popover";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useAuthed } from "@/store/app-provider";
import { useLookups } from "../../hooks";
import { ProjectBadge } from "../../status-badge";
import { buttonClass } from "../../ui/button";
import { Avatar, Badge } from "../../ui/display";
import { Icon } from "../../ui/icon";
import { useProject } from "./context";

export function ProjectHeader() {
  const { state } = useAuthed();
  const { project, base, canEdit, canManage } = useProject();
  const { userName, teamName } = useLookups();
  const company = state.companies.find((c) => c.id === project.companyId);
  const opportunity = state.opportunities.find((o) => o.id === project.opportunityId);
  const quickLinks = project.quickLinkIds
    .map((id) => state.projectLinks.find((l) => l.id === id))
    .filter((l) => l !== undefined)
    .slice(0, 3);

  const createItems = [
    canEdit && { href: `${base}/board?new=task`, label: "Task" },
    canEdit && { href: `${base}/mom?new=1`, label: "MOM" },
    canEdit && { href: `${base}/files?tab=notes&new=1`, label: "Catatan" },
    canManage && { href: `${base}/milestones?new=1`, label: "Milestone" },
    canEdit && { href: `${base}/changes?new=1`, label: "Change request" },
  ].filter((x) => x !== false);

  return (
    <header className="flex flex-col gap-3 border-b border-line pb-5">
      <Link href="/projects" className="inline-flex w-fit items-center gap-1.5 text-xs text-fg-muted hover:text-fg">
        <Icon icon={ArrowLeft} size={14} /> Semua project
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="size-3 rounded-full" style={{ background: project.color }} aria-hidden />
        <h1 className="font-display text-2xl font-medium tracking-[-0.02em] text-fg">{project.name}</h1>
        <ProjectBadge status={project.status} />
        {project.archived && <Badge>Diarsipkan</Badge>}
        <span className="flex items-center gap-2 text-sm text-fg-muted">
          <Avatar name={userName(project.leadId)} size="small" color="brand" />
          {userName(project.leadId)}
        </span>
        {createItems.length > 0 && (
          <Popover.Root>
            <Popover.Trigger className={buttonClass({ variant: "secondary", tone: "neutral", size: "small" }) + " md:ml-auto"}>
              <Icon icon={Plus} size={14} /> Baru
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="end" sideOffset={6} className="z-50 min-w-44 rounded-xs bg-overlay p-1 shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-md)] backdrop-blur-xl">
                {createItems.map((item) => (
                  <Popover.Close asChild key={item.label}>
                    <Link href={item.href} className="block rounded-xs px-3 py-2 text-sm text-fg hover:bg-hover">{item.label}</Link>
                  </Popover.Close>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        <span className="font-mono text-fg-brand">{project.code}</span>
        <span>·</span>
        <span>{project.teamIds.map(teamName).join(", ")}</span>
        {opportunity && (<><span>·</span><span className="font-mono">{opportunity.code}</span></>)}
        <span>·</span>
        {company ? <Link href={`${base}/client`} className="hover:text-fg-brand hover:underline">{company.name}</Link> : <span>Project internal</span>}
      </p>
      {quickLinks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((l) => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-hover px-3 text-xs text-fg-muted hover:text-fg">
              {l.label} <Icon icon={ExternalLink} size={12} />
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
