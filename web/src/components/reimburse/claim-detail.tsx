"use client";

import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { allowedReimburseActions, canReviewReimburseItems, reimburseStatusLabel } from "@/lib/calc/approval";
import { activeItems, claimDeclined, claimGross, claimTotal } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { formatDate, formatRupiah } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { actOnReimburse, setReimburseItemDecline } from "@/store/actions-reimburse";
import { ApprovalTimeline } from "../approval-timeline";
import { DecisionDialog, type Decision } from "../approvals/decision-dialog";
import { useLookups } from "../hooks";
import { ReimburseBadge } from "../status-badge";
import { Button } from "../ui/button";
import { Sheet } from "../ui/sheet";
import { ClaimItems } from "./claim-items";
import { PaymentBadge } from "./parts";

type Props = { claim: Reimbursement; onClose: () => void; onRevise?: (r: Reimbursement) => void; onPay?: (ids: string[]) => void };

const steps = [
  { key: "submitted", label: "Diajukan" },
  { key: "finance", label: "Review Finance" },
  { key: "stakeholder", label: "Approval Stakeholder" },
  { key: "paid", label: "Dibayar" },
] as const;

function reached(r: Reimbursement): number {
  switch (r.status) {
    case "pending_finance": case "revision": return 1;
    case "pending_stakeholder": return 2;
    case "approved": return 3;
    case "paid": return 4;
    case "rejected": return r.logs.some((l) => l.from === "pending_stakeholder" && l.to === "rejected") ? 2 : 1;
  }
}

/** Detail satu pengajuan: rincian baris, alasan tolak, riwayat, dan aksi sesuai peran. */
export function ClaimDetail({ claim: r, onClose, onRevise, onPay }: Props) {
  const { actor, run } = useAuthed();
  const { userName } = useLookups();
  const [decision, setDecision] = useState<Decision | null>(null);
  const acts = allowedReimburseActions(actor, r.userId, r.status);
  const canReview = canReviewReimburseItems(actor, r.userId, r.status);
  const total = claimTotal(r);
  const lastNote = [...r.logs].reverse().find((l) => l.to === r.status);
  const done = reached(r);
  const ask = (d: Omit<Decision, "noteRequired" | "tone"> & Partial<Pick<Decision, "noteRequired" | "tone">>) => setDecision({ tone: "brand", noteRequired: false, ...d });

  const decide = (action: "forward" | "approve" | "revision" | "reject", label: string, tone: "brand" | "danger") =>
    ask({ title: `${label}: ${r.number}`, confirmLabel: label, tone, noteRequired: tone === "danger", onConfirm: (note) => run((s) => actOnReimburse(s, r.id, action, actor, note || undefined), "Keputusan tersimpan.") });

  return (
    <>
      <Sheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={`Reimburse ${r.number}`}
        header={
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs text-fg-subtle">{r.number} · diajukan {formatDate(r.submittedAt)}</p>
            <h2 className="font-display text-lg font-medium">{r.title}</h2>
            <p className="text-sm text-fg-muted">{userName(r.userId)}</p>
            <div className="mt-1 flex flex-wrap gap-2"><ReimburseBadge status={r.status === "paid" ? "approved" : r.status} />{r.status !== "rejected" && (r.status === "approved" || r.status === "paid") && <PaymentBadge r={r} />}</div>
          </div>
        }
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="text-sm">Dibayarkan <span className="font-mono">{formatRupiah(total)}</span></p>
            <div className="flex flex-wrap gap-2">
              {acts.includes("reject") && <Button variant="secondary" tone="danger" onClick={() => decide("reject", "Tolak semua", "danger")}>Tolak semua</Button>}
              {acts.includes("revision") && <Button variant="secondary" tone="danger" onClick={() => decide("revision", "Minta revisi", "danger")}>Minta revisi</Button>}
              {acts.includes("forward") && <Button disabled={activeItems(r).length === 0} onClick={() => decide("forward", "Teruskan ke Stakeholder", "brand")}>Teruskan ke Stakeholder</Button>}
              {acts.includes("approve") && <Button disabled={activeItems(r).length === 0} onClick={() => decide("approve", `Setujui ${formatRupiah(total)}`, "brand")}>Setujui {formatRupiah(total)}</Button>}
              {acts.includes("mark_paid") && onPay && <Button onClick={() => onPay([r.id])}>Bayar {formatRupiah(total)}</Button>}
              {acts.includes("resubmit") && onRevise && <Button onClick={() => onRevise(r)}>Perbaiki & kirim ulang</Button>}
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <ol className="grid grid-cols-4 gap-2">
            {steps.map((s, i) => {
              const ok = i < done;
              const failed = r.status === "rejected" && i === done;
              return (
                <li key={s.key} className="flex flex-col gap-1.5">
                  <span className={cn("h-1 rounded-full", ok ? "bg-success" : failed ? "bg-danger" : "bg-hover")} />
                  <span className={cn("flex items-center gap-1 text-[11px]", ok ? "text-fg" : failed ? "text-fg-danger" : "text-fg-subtle")}>
                    {ok && <Check size={12} strokeWidth={2} />} {failed ? "Ditolak" : s.label}
                  </span>
                </li>
              );
            })}
          </ol>

          {(r.status === "rejected" || r.status === "revision") && lastNote?.note && (
            <Callout tone="danger" title={r.status === "rejected" ? `Ditolak oleh ${userName(lastNote.byUserId)}` : `Diminta revisi oleh ${userName(lastNote.byUserId)}`}>{lastNote.note}</Callout>
          )}
          {r.payment && (
            <Callout tone="success" title={`Dibayar ${formatDate(r.payment.date)} ${r.payment.method === "payroll" ? "lewat payroll" : "via transfer"}`}>
              {r.payment.reference ? `Referensi: ${r.payment.reference} · ` : ""}oleh {userName(r.payment.byUserId)}
            </Callout>
          )}
          {canReview && <p className="text-xs text-fg-muted">Baris yang tidak sesuai bisa ditolak satu per satu dengan alasan. Sisanya tetap diproses.</p>}

          <ClaimItems
            items={r.items}
            onDecline={canReview ? (i) => ask({ title: `Tolak baris: ${i.description}`, confirmLabel: "Tolak baris", tone: "danger", noteRequired: true, onConfirm: (note) => run((s) => setReimburseItemDecline(s, r.id, i.id, note, actor), "Baris ditolak.") }) : undefined}
            onRestore={canReview ? (i) => run((s) => setReimburseItemDecline(s, r.id, i.id, null, actor), "Baris dipulihkan.") : undefined}
          />

          <dl className="grid grid-cols-3 gap-3 rounded-s bg-sunken p-4 text-sm">
            <div><dt className="text-xs text-fg-subtle">Diajukan</dt><dd className="font-mono">{formatRupiah(claimGross(r))}</dd></div>
            <div><dt className="text-xs text-fg-subtle">Ditolak</dt><dd className="font-mono text-fg-danger">{formatRupiah(claimDeclined(r))}</dd></div>
            <div><dt className="text-xs text-fg-subtle">Dibayarkan</dt><dd className="font-mono text-fg-success">{formatRupiah(total)}</dd></div>
          </dl>

          <div>
            <p className="mb-2 text-xs text-fg-subtle">Riwayat</p>
            <ApprovalTimeline logs={r.logs} labels={reimburseStatusLabel} />
          </div>
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
