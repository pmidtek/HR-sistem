"use client";

import {
  allowedLeaveActions,
  allowedReimburseActions,
  leaveStatusLabel,
  type LeaveAction,
} from "@/lib/calc/approval";
import { formatDate, formatDayShort, formatDuration } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { actOnLeave, actOnOvertime } from "@/store/actions";
import { useState } from "react";
import { ClaimDetail } from "../reimburse/claim-detail";
import { ClaimTable } from "../reimburse/claim-table";
import { PayDialog } from "../reimburse/pay-dialog";
import { ApprovalBadge } from "../status-badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/display";
import type { Decision } from "./decision-dialog";
import { RequestCard } from "./request-card";
import { Stagger } from "../ui/motion";

type QueueProps = { onlyPending: boolean; onDecide: (d: Decision) => void };

const leaveButtons: Record<Exclude<LeaveAction, "cancel">, { label: string; tone: "brand" | "danger"; variant: "primary" | "secondary"; noteRequired: boolean }> = {
  forward: { label: "Teruskan ke Stakeholder", tone: "brand", variant: "primary", noteRequired: false },
  approve: { label: "Setujui", tone: "brand", variant: "primary", noteRequired: false },
  reject: { label: "Tolak", tone: "danger", variant: "secondary", noteRequired: true },
};

const grid = "grid gap-3 lg:grid-cols-2";

export function LeaveQueue({ onlyPending, onDecide }: QueueProps) {
  const { state, actor, today, run } = useAuthed();
  const typeName = (id: string) => state.leaveTypes.find((t) => t.id === id)?.name ?? id;
  const rows = state.leaveRequests
    .map((r) => ({ r, acts: allowedLeaveActions(actor, r.userId, r.status).filter((a): a is Exclude<LeaveAction, "cancel"> => a !== "cancel") }))
    .filter(({ acts }) => !onlyPending || acts.length > 0);
  if (rows.length === 0) return <EmptyState title="Tidak ada pengajuan cuti" description="Semua sudah diproses." />;
  return (
    <Stagger className={grid}>
      {rows.map(({ r, acts }, i) => {
        const bal = state.leaveBalances.find((b) => b.userId === r.userId && b.leaveTypeId === r.leaveTypeId);
        return (
          <RequestCard
            index={i}
            key={r.id}
            userId={r.userId}
            kind={typeName(r.leaveTypeId)}
            badge={<ApprovalBadge status={r.status} />}
            headline={`${formatDate(r.startDate)} – ${formatDate(r.endDate)} · ${r.workingDays} hari kerja`}
            detail={<>{r.reason}{bal && <span className="mt-1 block font-mono text-xs text-fg-subtle">Saldo: sisa {bal.quota - bal.used} dari {bal.quota} hari</span>}</>}
            logs={r.logs}
            labels={leaveStatusLabel}
            actions={acts.length > 0 && acts.map((a) => (
              <Button key={a} size="small" tone={leaveButtons[a].tone} variant={leaveButtons[a].variant}
                onClick={() => onDecide({
                  title: `${leaveButtons[a].label}: cuti`, confirmLabel: leaveButtons[a].label, tone: leaveButtons[a].tone, noteRequired: leaveButtons[a].noteRequired,
                  onConfirm: (note) => run((s) => actOnLeave(s, r.id, a, actor, today, note || undefined), "Keputusan tersimpan."),
                })}>
                {leaveButtons[a].label}
              </Button>
            ))}
          />
        );
      })}
    </Stagger>
  );
}

export function OvertimeQueue({ onlyPending, onDecide }: QueueProps) {
  const { state, actor, run } = useAuthed();
  const rows = state.overtimeRequests
    .map((r) => ({ r, acts: allowedLeaveActions(actor, r.userId, r.status).filter((a): a is Exclude<LeaveAction, "cancel"> => a !== "cancel") }))
    .filter(({ acts }) => !onlyPending || acts.length > 0);
  if (rows.length === 0) return <EmptyState title="Tidak ada pengajuan lembur" description="Semua sudah diproses." />;
  return (
    <Stagger className={grid}>
      {rows.map(({ r, acts }, i) => {
        const entries = state.timesheet.filter((e) => e.userId === r.userId && e.date === r.date).sort((a, b) => a.start.localeCompare(b.start));
        return (
          <RequestCard
            index={i}
            key={r.id}
            userId={r.userId}
            kind={r.isHoliday ? "Lembur hari libur" : "Lembur hari kerja"}
            badge={<ApprovalBadge status={r.status} />}
            headline={<>{formatDayShort(r.date)} · <span className="text-fg-brand">{formatDuration(r.approvedMinutes ?? r.requestedMinutes)}</span></>}
            detail={
              <>
                {r.reason}
                <span className="mt-2 flex flex-col gap-0.5 font-mono text-[11px] text-fg-subtle">
                  {entries.map((e) => <span key={e.id}>{e.start}–{e.end} {e.projectCode} · {e.description}</span>)}
                </span>
              </>
            }
            logs={r.logs}
            labels={leaveStatusLabel}
            actions={acts.length > 0 && acts.map((a) => (
              <Button key={a} size="small" tone={leaveButtons[a].tone} variant={leaveButtons[a].variant}
                onClick={() => onDecide({
                  title: `${leaveButtons[a].label}: lembur`, confirmLabel: leaveButtons[a].label, tone: leaveButtons[a].tone, noteRequired: leaveButtons[a].noteRequired,
                  requestedMinutes: a === "reject" ? undefined : r.requestedMinutes,
                  onConfirm: (note, minutes) => run((s) => actOnOvertime(s, r.id, a, actor, note || undefined, minutes), "Keputusan tersimpan."),
                })}>
                {leaveButtons[a].label}
              </Button>
            ))}
          />
        );
      })}
    </Stagger>
  );
}

/** Reimburse: satu baris per pengajuan; detail & keputusan (termasuk tolak per baris) di panel samping. */
export function ReimburseQueue({ onlyPending }: QueueProps) {
  const { state, actor } = useAuthed();
  const [openId, setOpenId] = useState<string | null>(null);
  const [paying, setPaying] = useState<string[] | null>(null);
  const rows = state.reimbursements
    .filter((r) => {
      const acts = allowedReimburseActions(actor, r.userId, r.status).filter((a) => a !== "resubmit" && a !== "mark_paid");
      return onlyPending ? acts.length > 0 : r.userId !== actor.id;
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const open = openId ? state.reimbursements.find((r) => r.id === openId) : undefined;
  return (
    <>
      <ClaimTable list={rows} onOpen={setOpenId} showOwner empty="Tidak ada reimburse yang perlu ditinjau" />
      {open && <ClaimDetail claim={open} onClose={() => setOpenId(null)} onPay={setPaying} />}
      {paying && <PayDialog ids={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
