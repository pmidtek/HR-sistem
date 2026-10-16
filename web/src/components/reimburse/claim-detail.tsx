"use client";

import { BadgeCheck, CalendarClock, Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { canReviewReimburseItems, reimburseStatusLabel } from "@/lib/calc/approval";
import { activeItems, claimDeclined, claimGross, claimTotal } from "@/lib/calc/reimburse";
import { maskAccount } from "@/lib/calc/reimburse-risk";
import { cn } from "@/lib/cn";
import { formatDate, formatDayShort, formatRupiah } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { actOnReimburse, reimburseActionsFor, setReimburseItemDecline, sponsorOf } from "@/store/actions-reimburse";
import { ApprovalTimeline } from "../approval-timeline";
import { DecisionDialog, type Decision } from "../approvals/decision-dialog";
import { useLookups } from "../hooks";
import { ReimburseBadge } from "../status-badge";
import { Button } from "../ui/button";
import { CollapsibleSection } from "../ui/collapsible-section";
import { Icon } from "../ui/icon";
import { Sheet } from "../ui/sheet";
import { ClaimItems } from "./claim-items";
import { FileChips } from "./file-viewer";
import { PaymentBadge } from "./parts";
import { canSeeFullAccount, PayoutAccountLine, useVerifyAccount } from "./payout-account";
import { RiskPanel } from "./risk-panel";
import { usePayDate } from "./use-pay-date";

type Props = { claim: Reimbursement; onClose: () => void; onRevise?: (r: Reimbursement) => void; onPay?: (ids: string[]) => void };

/** Langkah alur; pengajuan external punya langkah tambahan "PIC confirmation". */
function stepsFor(external: boolean): { label: string; status: Reimbursement["status"] | "submitted" }[] {
  return [
    { label: "Submitted", status: "submitted" },
    ...(external ? [{ label: "PIC confirmation", status: "pending_sponsor" as const }] : []),
    { label: "Finance review", status: "pending_finance" },
    { label: "Stakeholder approval", status: "pending_stakeholder" },
    { label: "Paid", status: "paid" },
  ];
}

/** Jumlah langkah yang sudah lewat. */
function reached(r: Reimbursement, steps: ReturnType<typeof stepsFor>): number {
  if (r.status === "paid") return steps.length;
  if (r.status === "approved") return steps.length - 1;
  if (r.status === "rejected" || r.status === "revision") {
    const from = [...r.logs].reverse().find((l) => l.to === r.status)?.from;
    const at = steps.findIndex((s) => s.status === from);
    return at > 0 ? at : 1;
  }
  return Math.max(1, steps.findIndex((s) => s.status === r.status));
}

/** Detail satu pengajuan: rincian baris, alasan tolak, bukti bayar, riwayat, dan aksi sesuai peran. */
export function ClaimDetail({ claim: r, onClose, onRevise, onPay }: Props) {
  const { state, actor, today, run } = useAuthed();
  const { userName } = useLookups();
  const payDate = usePayDate();
  const [decision, setDecision] = useState<Decision | null>(null);
  const owner = state.users.find((u) => u.id === r.userId);
  const sponsorId = sponsorOf(state, r.userId);
  const acts = reimburseActionsFor(state, actor, r);
  const canReview = canReviewReimburseItems(actor, r.userId, r.status, sponsorId);
  const isReviewer = actor.id !== r.userId && (actor.role !== "employee" || actor.id === sponsorId);
  const verify = useVerifyAccount(r.userId);
  const steps = stepsFor(owner?.role === "external");
  const total = claimTotal(r);
  const lastNote = [...r.logs].reverse().find((l) => l.to === r.status);
  const done = reached(r, steps);
  const due = payDate(r.submittedAt);
  const ask = (d: Omit<Decision, "noteRequired" | "tone"> & Partial<Pick<Decision, "noteRequired" | "tone">>) => setDecision({ tone: "brand", noteRequired: false, ...d });

  const decide = (action: "confirm" | "forward" | "approve" | "revision" | "reject", label: string, tone: "brand" | "danger") =>
    ask({ title: `${label}: ${r.number}`, confirmLabel: label, tone, noteRequired: tone === "danger", onConfirm: (note) => run((s) => actOnReimburse(s, r.id, action, actor, note || undefined), "Decision saved.") });

  return (
    <>
      <Sheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={`Reimbursement ${r.number}`}
        header={
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs text-fg-subtle">{r.number} · submitted {formatDate(r.submittedAt)}</p>
            <h2 className="font-display text-lg font-medium">{r.title}</h2>
            <p className="text-sm text-fg-muted">
              {userName(r.userId)}
              {owner?.role === "external" && owner.external && <> · <span className="text-fg-brand">External</span>{owner.external.company ? ` (${owner.external.company})` : ""} · PIC {userName(owner.external.sponsorId)}</>}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <ReimburseBadge status={r.status === "paid" ? "approved" : r.status} />
              {(r.status === "approved" || r.status === "paid") && <PaymentBadge r={r} />}
            </div>
          </div>
        }
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="text-sm">{r.status === "paid" ? "Paid" : "To be paid"} <span className="font-mono">{formatRupiah(total)}</span></p>
            <div className="flex flex-wrap gap-2">
              {acts.includes("reject") && <Button variant="secondary" tone="danger" onClick={() => decide("reject", "Reject all", "danger")}>Reject all</Button>}
              {acts.includes("revision") && <Button variant="secondary" tone="danger" onClick={() => decide("revision", "Request revision", "danger")}>Request revision</Button>}
              {acts.includes("confirm") && <Button disabled={activeItems(r).length === 0} onClick={() => decide("confirm", "Confirm expenses", "brand")}>Confirm expenses</Button>}
              {acts.includes("forward") && <Button disabled={activeItems(r).length === 0} onClick={() => decide("forward", "Forward to Stakeholder", "brand")}>Forward to Stakeholder</Button>}
              {acts.includes("approve") && <Button disabled={activeItems(r).length === 0} onClick={() => decide("approve", `Approve ${formatRupiah(total)}`, "brand")}>Approve {formatRupiah(total)}</Button>}
              {acts.includes("mark_paid") && onPay && <Button onClick={() => onPay([r.id])}>Pay {formatRupiah(total)}</Button>}
              {acts.includes("resubmit") && onRevise && <Button onClick={() => onRevise(r)}>Fix & resubmit</Button>}
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <ol className={cn("grid gap-2", steps.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
            {steps.map(({ label }, i) => {
              const ok = i < done;
              const failed = r.status === "rejected" && i === done;
              return (
                <li key={label} className="flex flex-col gap-1.5">
                  <span className={cn("h-1 rounded-full", ok ? "bg-success" : failed ? "bg-danger" : "bg-hover")} />
                  <span className={cn("flex items-center gap-1 text-[11px]", ok ? "text-fg" : failed ? "text-fg-danger" : "text-fg-subtle")}>
                    {ok && <Check size={12} strokeWidth={2} />} {failed ? "Rejected" : label}
                  </span>
                </li>
              );
            })}
          </ol>

          {(r.status === "rejected" || r.status === "revision") && lastNote?.note && (
            <Callout tone="danger" title={r.status === "rejected" ? `Rejected by ${userName(lastNote.byUserId)}` : `Revision requested by ${userName(lastNote.byUserId)}`}>{lastNote.note}</Callout>
          )}

          {r.payment && (
            <div className="flex flex-col gap-2 rounded-s bg-success-subtle px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-fg-success">
                <Icon icon={BadgeCheck} size={16} /> Paid on {formatDate(r.payment.date)} {r.payment.method === "payroll" ? "via payroll" : "by bank transfer"}
              </p>
              <p className="text-xs text-fg-success/90">
                {r.payment.toAccount && <>To {r.payment.toAccount.bankName} {canSeeFullAccount(actor, r.userId) ? r.payment.toAccount.accountNumber : maskAccount(r.payment.toAccount.accountNumber)} a.n. {r.payment.toAccount.accountHolder} · </>}
                {r.payment.reference ? `Ref. ${r.payment.reference} · ` : ""}recorded by {userName(r.payment.byUserId)}
              </p>
              <div>
                <p className="mb-1 text-[11px] text-fg-success/80">Payment proof</p>
                <FileChips files={r.payment.proofFiles} tone="success" />
              </div>
            </div>
          )}

          {(r.status === "pending_finance" || r.status === "pending_stakeholder" || r.status === "approved") && (
            <p className={cn("flex items-center gap-2 rounded-s bg-sunken px-4 py-3 text-xs", r.status === "approved" && due < today ? "text-fg-danger" : "text-fg-muted")}>
              <Icon icon={CalendarClock} size={14} />
              {r.status === "approved" && due < today
                ? `Overdue: this claim was due on ${formatDayShort(due)}.`
                : `Estimated payment: ${formatDayShort(due)}, once approved. Paid by Finance/HR with a transfer receipt attached.`}
            </p>
          )}

          {isReviewer && <RiskPanel claim={r} />}
          {isReviewer && (actor.role !== "employee") && (
            <div className="rounded-s px-4 py-3 shadow-[inset_0_0_0_1px_var(--border-default)]">
              <p className="mb-2 text-xs text-fg-subtle">Pays to</p>
              <PayoutAccountLine owner={owner} onVerify={verify} />
            </div>
          )}
          {acts.includes("confirm") && <p className="text-xs text-fg-muted">You are the PIC for this external. Confirm only if the work and expenses really happened.</p>}
          {canReview && <p className="text-xs text-fg-muted">You can decline individual items with a reason. The rest of the claim continues.</p>}

          <ClaimItems
            items={r.items}
            onDecline={canReview ? (i) => ask({ title: `Decline item: ${i.description}`, confirmLabel: "Decline item", tone: "danger", noteRequired: true, onConfirm: (note) => run((s) => setReimburseItemDecline(s, r.id, i.id, note, actor), "Item declined.") }) : undefined}
            onRestore={canReview ? (i) => run((s) => setReimburseItemDecline(s, r.id, i.id, null, actor), "Item restored.") : undefined}
          />

          <dl className="grid grid-cols-3 gap-3 rounded-s bg-sunken p-4 text-sm">
            <div><dt className="text-xs text-fg-subtle">Submitted</dt><dd className="font-mono">{formatRupiah(claimGross(r))}</dd></div>
            <div><dt className="text-xs text-fg-subtle">Declined</dt><dd className="font-mono text-fg-danger">{formatRupiah(claimDeclined(r))}</dd></div>
            <div><dt className="text-xs text-fg-subtle">{r.status === "paid" ? "Paid" : "To be paid"}</dt><dd className="font-mono text-fg-success">{formatRupiah(total)}</dd></div>
          </dl>

          <CollapsibleSection id="claim-history" title={<span className="text-sm">History</span>} summary={`${r.logs.length} step(s)`} defaultOpen={false}>
            <ApprovalTimeline logs={r.logs} labels={reimburseStatusLabel} />
          </CollapsibleSection>
        </div>
      </Sheet>
      {decision && <DecisionDialog decision={decision} onClose={() => setDecision(null)} />}
    </>
  );
}

function Callout({ tone, title, children }: { tone: "danger" | "success"; title: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-s px-4 py-3 text-sm", tone === "danger" ? "bg-danger-subtle text-fg-danger" : "bg-success-subtle text-fg-success")}>
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-xs opacity-90">{children}</p>
    </div>
  );
}
