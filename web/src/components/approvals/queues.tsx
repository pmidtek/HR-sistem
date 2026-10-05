"use client";

import { FileImage } from "lucide-react";
import {
  allowedLeaveActions,
  allowedReimburseActions,
  leaveStatusLabel,
  reimburseStatusLabel,
  type LeaveAction,
  type ReimburseAction,
} from "@/lib/calc/approval";
import { formatDate, formatDayShort, formatDuration, formatRupiah } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { actOnLeave, actOnOvertime, actOnReimburse } from "@/store/actions";
import { ApprovalBadge, ReimburseBadge } from "../status-badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/display";
import { Icon } from "../ui/icon";
import type { Decision } from "./decision-dialog";
import { RequestCard } from "./request-card";

type QueueProps = { onlyPending: boolean; onDecide: (d: Decision) => void };

const leaveButtons: Record<Exclude<LeaveAction, "cancel">, { label: string; tone: "brand" | "danger"; variant: "primary" | "secondary"; noteRequired: boolean }> = {
  forward: { label: "Teruskan ke Stakeholder", tone: "brand", variant: "primary", noteRequired: false },
  approve: { label: "Setujui", tone: "brand", variant: "primary", noteRequired: false },
  reject: { label: "Tolak", tone: "danger", variant: "secondary", noteRequired: true },
};

const reimburseButtons: Partial<Record<ReimburseAction, { label: string; tone: "brand" | "danger"; variant: "primary" | "secondary"; noteRequired: boolean }>> = {
  forward: { label: "Teruskan ke Stakeholder", tone: "brand", variant: "primary", noteRequired: false },
  approve: { label: "Setujui", tone: "brand", variant: "primary", noteRequired: false },
  revision: { label: "Minta revisi", tone: "danger", variant: "secondary", noteRequired: true },
  reject: { label: "Tolak", tone: "danger", variant: "secondary", noteRequired: true },
  mark_paid: { label: "Tandai sudah dibayar", tone: "brand", variant: "secondary", noteRequired: false },
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
    <div className={grid}>
      {rows.map(({ r, acts }) => {
        const bal = state.leaveBalances.find((b) => b.userId === r.userId && b.leaveTypeId === r.leaveTypeId);
        return (
          <RequestCard
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
    </div>
  );
}

export function OvertimeQueue({ onlyPending, onDecide }: QueueProps) {
  const { state, actor, run } = useAuthed();
  const rows = state.overtimeRequests
    .map((r) => ({ r, acts: allowedLeaveActions(actor, r.userId, r.status).filter((a): a is Exclude<LeaveAction, "cancel"> => a !== "cancel") }))
    .filter(({ acts }) => !onlyPending || acts.length > 0);
  if (rows.length === 0) return <EmptyState title="Tidak ada pengajuan lembur" description="Semua sudah diproses." />;
  return (
    <div className={grid}>
      {rows.map(({ r, acts }) => {
        const entries = state.timesheet.filter((e) => e.userId === r.userId && e.date === r.date).sort((a, b) => a.start.localeCompare(b.start));
        return (
          <RequestCard
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
    </div>
  );
}

export function ReimburseQueue({ onlyPending, onDecide }: QueueProps) {
  const { state, actor, today, run } = useAuthed();
  const categoryName = (id: string) => state.reimbursementCategories.find((c) => c.id === id)?.name ?? id;
  const rows = state.reimbursements
    .map((r) => ({ r, acts: allowedReimburseActions(actor, r.userId, r.status).filter((a) => a !== "resubmit") }))
    .filter(({ acts }) => !onlyPending || acts.length > 0);
  if (rows.length === 0) return <EmptyState title="Tidak ada reimburse" description="Semua sudah diproses." />;
  return (
    <div className={grid}>
      {rows.map(({ r, acts }) => (
        <RequestCard
          key={r.id}
          userId={r.userId}
          kind={`${categoryName(r.categoryId)} · ${r.projectCode}`}
          badge={<ReimburseBadge status={r.status} />}
          headline={<span className="font-serif text-2xl font-normal">{formatRupiah(r.amount)}</span>}
          detail={
            <>
              {formatDate(r.date)} · {r.description}
              <span className="mt-2 flex flex-wrap gap-1.5">
                {r.files.map((f) => (
                  <button key={f} type="button" className="inline-flex items-center gap-1.5 rounded-xxs bg-sunken px-2 py-1 text-xs text-fg-brand hover:underline">
                    <Icon icon={FileImage} size={12} /> {f}
                  </button>
                ))}
              </span>
            </>
          }
          logs={r.logs}
          labels={reimburseStatusLabel}
          actions={acts.length > 0 && acts.map((a) => {
            const b = reimburseButtons[a];
            if (!b) return null;
            return (
              <Button key={a} size="small" tone={b.tone} variant={b.variant}
                onClick={() => onDecide({
                  title: `${b.label}: reimburse`, confirmLabel: b.label, tone: b.tone, noteRequired: b.noteRequired,
                  onConfirm: (note) => run((s) => actOnReimburse(s, r.id, a, actor, today, note || undefined), "Keputusan tersimpan."),
                })}>
                {b.label}
              </Button>
            );
          })}
        />
      ))}
    </div>
  );
}
