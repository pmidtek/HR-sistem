"use client";

import { ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { isDeliverableLate } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Deliverable, DeliverablePhase, DeliverableStatus } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deliverableStatusLabel, setDeliverableStatus } from "@/store/actions-plan";
import { stamp } from "@/store/project-core";
import { useLookups } from "@/components/hooks";
import { DeliverableSheet, phaseLabel } from "@/components/projects/deliverables/deliverable-sheet";
import { useProjectData } from "@/components/projects/use-project-data";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, type BadgeTone } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { rowClass, Table, Td, Th } from "@/components/ui/table";

const statusTone: Record<DeliverableStatus, BadgeTone> = { draft: "neutral", in_progress: "warning", review: "brand", sent: "success" };
const sel = "h-8 rounded-xxs bg-sunken px-2 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border-default)]";

export default function DeliverablesPage() {
  const { state, actor, today, run } = useAuthed();
  const { project, canManage } = useProject();
  const { userName } = useLookups();
  const data = useProjectData();
  const [status, setStatus] = useState("");
  const [phase, setPhase] = useState("");
  const [open, setOpen] = useState<Deliverable | "new" | null>(null);
  const all = state.deliverables.filter((d) => d.projectId === project.id);
  const list = all.filter((d) => (!status || d.status === status) && (!phase || d.phase === phase));
  const phases = (Object.keys(phaseLabel) as DeliverablePhase[]).filter((p) => list.some((d) => d.phase === p));

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Deliverables"
        description="Dokumen dan hasil kerja yang dikirim ke klien, per fase."
        actions={canManage && <Button size="small" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setOpen("new")}>Deliverable baru</Button>}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(deliverableStatusLabel) as DeliverableStatus[]).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(status === s ? "" : s)} className="text-left">
            <Card padding="sm" interactive className={cn("flex flex-col gap-1", status === s && "shadow-[inset_0_0_0_1px_var(--brand)]")}>
              <span className="text-xs text-fg-muted">{deliverableStatusLabel[s]}</span>
              <span className="font-serif text-3xl leading-none">{all.filter((d) => d.status === s).length}</span>
            </Card>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
          <option value="">Semua status</option>
          {Object.entries(deliverableStatusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={sel} value={phase} onChange={(e) => setPhase(e.target.value)} aria-label="Filter fase">
          <option value="">Semua fase</option>
          {Object.entries(phaseLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {phases.length === 0 && <EmptyState title="Tidak ada deliverable" description="Ubah filter atau buat deliverable baru." />}
      {phases.map((p) => (
        <section key={p} className="flex flex-col gap-2">
          <h3 className="font-mono text-[11px] tracking-[0.08em] text-fg-subtle uppercase">{phaseLabel[p]}</h3>
          <Table className="min-w-[640px] table-fixed">
            <thead><tr><Th>Judul</Th><Th className="w-40">PIC</Th><Th className="w-40">Status</Th><Th className="w-32">Deadline</Th><Th className="w-24">Link</Th></tr></thead>
            <Stagger as="tbody">
              {list.filter((d) => d.phase === p).map((d, i) => (
                <StaggerItem as="tr" key={d.id} index={i} className={cn(rowClass, "cursor-pointer")} onClick={() => setOpen(d)}>
                  <Td className="truncate">{d.title}</Td>
                  <Td className="text-xs whitespace-nowrap text-fg-muted">{userName(d.ownerId)}</Td>
                  <Td>
                    {canManage ? (
                      <select className={sel} value={d.status} onClick={(e) => e.stopPropagation()} aria-label="Status"
                        onChange={(e) => run((s) => setDeliverableStatus(s, d.id, e.target.value as DeliverableStatus, actor, stamp(today)), "Status deliverable diperbarui.")}>
                        {Object.entries(deliverableStatusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    ) : <Badge tone={statusTone[d.status]} dot>{deliverableStatusLabel[d.status]}</Badge>}
                  </Td>
                  <Td className={cn("text-xs whitespace-nowrap", isDeliverableLate(d, today) ? "text-fg-danger" : "text-fg-muted")}>{d.deadline ? formatDate(d.deadline) : "–"}</Td>
                  <Td>
                    {d.link ? (
                      <a href={d.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-fg-brand hover:underline">
                        Buka <Icon icon={ExternalLink} size={12} />
                      </a>
                    ) : <span className="text-xs text-fg-subtle">–</span>}
                  </Td>
                </StaggerItem>
              ))}
            </Stagger>
          </Table>
        </section>
      ))}
      {open && <DeliverableSheet key={open === "new" ? "new" : open.id} deliverable={open === "new" ? null : open} data={data} onClose={() => setOpen(null)} />}
    </div>
  );
}
