"use client";

import { Check, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { addDays } from "@/lib/calc/dates";
import { crTransitions, refLabel, taskRef } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { ChangeRequest, ChangeStatus } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { crStatusLabel, transitionCr } from "@/store/actions-changes";
import { stamp } from "@/store/project-core";
import { newId } from "@/store/state";
import { useLookups } from "../../hooks";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { Sheet } from "../../ui/sheet";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";
import { sourceLabel } from "./cr-form-dialog";

const FLOW: ChangeStatus[] = ["submitted", "under_review", "approved", "implemented"];

/** Detail CR + alur status. Saat menyetujui: opsi buat task & geser target project. */
export function CrSheet({ cr, data, onClose, onEdit }: { cr: ChangeRequest; data: ProjectData; onClose: () => void; onEdit: () => void }) {
  const { actor, today, run } = useAuthed();
  const { project, base, canEdit, canManage } = useProject();
  const { userName } = useLookups();
  const [makeTask, setMakeTask] = useState(true);
  const [boardId, setBoardId] = useState(data.boards[0]?.id ?? "");
  const [shift, setShift] = useState(cr.impactDays > 0);
  const next = crTransitions[cr.status];
  const stepIndex = cr.status === "rejected" ? 2 : FLOW.indexOf(cr.status);

  function go(to: ChangeStatus) {
    const opts = to === "approved" ? { createTaskBoardId: makeTask ? boardId : undefined, shiftTarget: shift, taskId: newId("task") } : {};
    run((s) => transitionCr(s, cr.id, to, actor, stamp(today), opts), `${refLabel("CR", cr.number)} ${crStatusLabel[to].toLowerCase()}.`);
  }

  const rows: [string, string][] = [
    ["Sumber", sourceLabel[cr.source]], ["Diminta oleh", cr.requestedBy], ["Tanggal", formatDate(cr.requestedAt)],
    ["Dampak timeline", cr.impactDays ? `+${cr.impactDays} hari` : "Tidak ada"], ["Estimasi", cr.estimateHours !== null ? `${cr.estimateHours} jam` : "–"],
    ["Diputuskan", cr.decidedById ? `${userName(cr.decidedById)}${cr.decidedAt ? ` · ${formatDate(cr.decidedAt)}` : ""}` : "–"],
  ];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={cr.title}
      header={<div><p className="font-mono text-xs text-fg-brand">{refLabel("CR", cr.number)}</p><p className="font-display text-lg font-medium">{cr.title}</p></div>}
      footer={canEdit && (cr.status === "submitted" || cr.status === "under_review") && (
        <Button size="small" variant="ghost" tone="neutral" iconLeft={<Icon icon={Pencil} size={14} />} onClick={onEdit}>Edit CR</Button>
      )}>
      <div className="flex flex-col gap-6">
        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {FLOW.map((st, i) => {
            const label = st === "approved" && cr.status === "rejected" ? "Ditolak" : crStatusLabel[st];
            const done = i <= stepIndex;
            return (
              <li key={st} className="flex items-center gap-2">
                <span className={cn("flex h-7 items-center gap-1.5 rounded-pill px-3", done ? (cr.status === "rejected" && i === 2 ? "bg-danger-subtle text-fg-danger" : "bg-brand-subtle text-fg-brand") : "bg-hover text-fg-subtle")}>
                  {done && <Icon icon={Check} size={12} />}{label}
                </span>
                {i < FLOW.length - 1 && <span className="h-px w-4 bg-line-strong" />}
              </li>
            );
          })}
        </ol>
        <p className="text-sm whitespace-pre-line text-fg">{cr.description}</p>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[140px_1fr]">
          {rows.map(([k, v]) => (<div key={k} className="contents"><dt className="text-fg-muted">{k}</dt><dd>{v}</dd></div>))}
        </dl>
        {cr.impactNote && <p className="rounded-xs bg-sunken p-3 text-sm text-fg-muted">{cr.impactNote}</p>}
        {cr.linkedTaskIds.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-fg-muted">Task terkait:</span>
            {cr.linkedTaskIds.map((id) => { const t = data.taskById.get(id); return t ? <Link key={id} href={`${base}/board?board=${t.boardId}&task=${t.id}`} className="text-fg-brand hover:underline">{taskRef(t)} {t.title}</Link> : null; })}
          </div>
        )}
        {canManage && next.length > 0 && (
          <section className="flex flex-col gap-3 rounded-s p-4 shadow-[inset_0_0_0_1px_var(--border-strong)]">
            <h3 className="font-display text-sm font-medium">Keputusan</h3>
            {next.includes("approved") && (
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <Switch checked={makeTask} onChange={setMakeTask} label="Buat task dari CR di board" />
                  {makeTask && (
                    <select className="h-8 rounded-xxs bg-sunken px-2 text-xs shadow-[inset_0_0_0_1px_var(--border-default)]" value={boardId} onChange={(e) => setBoardId(e.target.value)} aria-label="Board">
                      {data.boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  )}
                </div>
                {cr.impactDays > 0 && (
                  <Switch checked={shift} onChange={setShift} label={`Geser target selesai +${cr.impactDays} hari (${formatDate(project.targetDate)} → ${formatDate(addDays(project.targetDate, cr.impactDays))})`} />
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {next.includes("under_review") && <Button size="small" variant="secondary" tone="neutral" onClick={() => go("under_review")}>Mulai review</Button>}
              {next.includes("rejected") && <Button size="small" variant="secondary" tone="danger" onClick={() => go("rejected")}>Tolak</Button>}
              {next.includes("approved") && <Button size="small" onClick={() => go("approved")}>Setujui</Button>}
              {next.includes("implemented") && <Button size="small" onClick={() => go("implemented")}>Tandai diimplementasikan</Button>}
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
}
