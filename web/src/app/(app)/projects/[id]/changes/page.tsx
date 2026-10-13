"use client";

import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useState } from "react";
import { crSummary, refLabel } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { ChangeRequest, ChangeStatus } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { crStatusLabel } from "@/store/actions-changes";
import { CrFormDialog, sourceLabel } from "@/components/projects/changes/cr-form-dialog";
import { CrSheet } from "@/components/projects/changes/cr-sheet";
import { useProjectData } from "@/components/projects/use-project-data";
import { useQueryParam } from "@/components/projects/use-query-param";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, type BadgeTone } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";
import { CountUp, CountUpScope } from "@/components/ui/motion";
import { rowClass, Table, Td, Th } from "@/components/ui/table";

const tone: Record<ChangeStatus, BadgeTone> = { submitted: "warning", under_review: "brand", approved: "success", rejected: "danger", implemented: "neutral" };
type SortKey = "number" | "requestedAt" | "impactDays" | "estimateHours";
type Sort = { key: SortKey; asc: boolean };

function Sortable({ k, label, sort, onSort }: { k: SortKey; label: string; sort: Sort; onSort: (s: Sort) => void }) {
  return (
    <button type="button" onClick={() => onSort({ key: k, asc: sort.key === k ? !sort.asc : true })} className="inline-flex items-center gap-1 uppercase hover:text-fg">
      {label}{sort.key === k && <Icon icon={sort.asc ? ArrowUp : ArrowDown} size={10} />}
    </button>
  );
}

const sel = "h-8 rounded-xxs bg-sunken px-2 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border-default)]";

export default function ChangesPage() {
  const { state } = useAuthed();
  const { project, canEdit } = useProject();
  const data = useProjectData();
  const [newParam, setNewParam] = useQueryParam("new");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "number", asc: false });
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ChangeRequest | "new" | null>(null);
  const all = state.changeRequests.filter((c) => c.projectId === project.id);
  const sum = crSummary(all);
  const list = all
    .filter((c) => (!source || c.source === source) && (!status || c.status === status))
    .sort((a, b) => ((a[sort.key] ?? -1) < (b[sort.key] ?? -1) ? -1 : 1) * (sort.asc ? 1 : -1));
  const open = all.find((c) => c.id === openId);
  const formOpen = editing ?? (newParam === "1" && canEdit ? "new" : null);
  return (
    <CountUpScope id={`changes-${project.id}`}>
      <div className="flex flex-col gap-5">
        <SectionHeader title="Change Request" description="Perubahan ruang lingkup dari klien atau internal, beserta dampaknya ke timeline."
          actions={canEdit && <Button size="small" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setEditing("new")}>CR baru</Button>} />
        <div className="grid grid-cols-3 gap-3">
          {([["Total CR", sum.total, ""], ["Disetujui", sum.approved, ""], ["Tambahan hari", sum.extraDays, "+"]] as const).map(([label, v, prefix]) => (
            <Card key={label} padding="sm" className="flex flex-col gap-1">
              <span className="text-xs text-fg-muted">{label}</span>
              <span className="font-serif text-3xl leading-none"><CountUp value={v} format={(n) => `${prefix}${n}`} /></span>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={sel} value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter sumber"><option value="">Semua sumber</option>{Object.entries(sourceLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status"><option value="">Semua status</option>{Object.entries(crStatusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        {list.length === 0 ? <EmptyState title="Tidak ada change request" /> : (
          <Table>
            <thead><tr>
              <Th><Sortable k="number" label="No." sort={sort} onSort={setSort} /></Th><Th>Judul</Th><Th>Sumber</Th><Th>Diminta oleh</Th><Th><Sortable k="requestedAt" label="Tanggal" sort={sort} onSort={setSort} /></Th>
              <Th className="text-right"><Sortable k="impactDays" label="Dampak" sort={sort} onSort={setSort} /></Th><Th className="text-right"><Sortable k="estimateHours" label="Estimasi" sort={sort} onSort={setSort} /></Th><Th>Status</Th>
            </tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className={cn(rowClass, "cursor-pointer")} onClick={() => setOpenId(c.id)}>
                  <Td className="font-mono text-xs whitespace-nowrap text-fg-brand">{refLabel("CR", c.number)}</Td>
                  <Td className="min-w-56">{c.title}</Td>
                  <Td className="text-xs text-fg-muted">{sourceLabel[c.source]}</Td>
                  <Td className="text-xs whitespace-nowrap text-fg-muted">{c.requestedBy}</Td>
                  <Td className="text-xs whitespace-nowrap text-fg-muted">{formatDate(c.requestedAt)}</Td>
                  <Td className="text-right font-mono text-xs">{c.impactDays ? `+${c.impactDays} hr` : "–"}</Td>
                  <Td className="text-right font-mono text-xs">{c.estimateHours !== null ? `${c.estimateHours} j` : "–"}</Td>
                  <Td><Badge tone={tone[c.status]} dot>{crStatusLabel[c.status]}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {open && <CrSheet key={open.id} cr={open} data={data} onClose={() => setOpenId(null)} onEdit={() => { setEditing(open); setOpenId(null); }} />}
        {formOpen && <CrFormDialog cr={formOpen === "new" ? null : formOpen} onClose={() => { setEditing(null); if (newParam) setNewParam(null); }} />}
      </div>
    </CountUpScope>
  );
}
