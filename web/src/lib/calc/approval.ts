import type { ApprovalStatus, ReimbursementStatus, Role } from "../types";

/**
 * Aturan transisi status approval. Nanti dipakai juga di custom endpoint Directus
 * (status hanya boleh berubah lewat endpoint, bukan update field langsung).
 */

export type Actor = { id: string; role: Role };

export type LeaveAction = "forward" | "reject" | "approve" | "cancel";
export type ReimburseAction = "confirm" | "forward" | "revision" | "reject" | "approve" | "resubmit" | "mark_paid";

export const leaveTransitions: Record<LeaveAction, { from: ApprovalStatus[]; to: ApprovalStatus }> = {
  forward: { from: ["pending_hr"], to: "pending_stakeholder" },
  reject: { from: ["pending_hr", "pending_stakeholder"], to: "rejected" },
  approve: { from: ["pending_stakeholder"], to: "approved" },
  cancel: { from: ["pending_hr", "pending_stakeholder", "approved"], to: "cancelled" },
};

export const reimburseTransitions: Record<ReimburseAction, { from: ReimbursementStatus[]; to: ReimbursementStatus }> = {
  confirm: { from: ["pending_sponsor"], to: "pending_finance" },
  forward: { from: ["pending_finance"], to: "pending_stakeholder" },
  revision: { from: ["pending_sponsor", "pending_finance"], to: "revision" },
  reject: { from: ["pending_sponsor", "pending_finance", "pending_stakeholder"], to: "rejected" },
  approve: { from: ["pending_stakeholder"], to: "approved" },
  // Pengajuan external kembali ke PIC (pending_sponsor); diatur di actions-reimburse.
  resubmit: { from: ["revision"], to: "pending_finance" },
  mark_paid: { from: ["approved"], to: "paid" },
};

/** Aksi yang boleh dilakukan actor pada pengajuan cuti/lembur. */
export function allowedLeaveActions(
  actor: Actor,
  ownerId: string,
  status: ApprovalStatus,
  opts: { startDate?: string; today?: string } = {},
): LeaveAction[] {
  const isOwner = actor.id === ownerId;
  const out: LeaveAction[] = [];
  if (isOwner) {
    if (status === "pending_hr" || status === "pending_stakeholder") out.push("cancel");
    if (status === "approved" && opts.startDate && opts.today && opts.startDate > opts.today) out.push("cancel");
    return out; // tidak boleh meng-approve pengajuan sendiri
  }
  if (status === "pending_hr" && actor.role === "hr") out.push("forward", "reject");
  if (status === "pending_stakeholder" && actor.role === "stakeholder") out.push("approve", "reject");
  return out;
}

/**
 * Aksi yang boleh dilakukan actor pada reimburse.
 * `sponsorId` = PIC internal pemilik (hanya untuk pengajuan external).
 */
export function allowedReimburseActions(actor: Actor, ownerId: string, status: ReimbursementStatus, sponsorId?: string | null): ReimburseAction[] {
  const isOwner = actor.id === ownerId;
  const out: ReimburseAction[] = [];
  if (isOwner && status === "revision") out.push("resubmit");
  if (!isOwner && status === "pending_sponsor" && sponsorId && actor.id === sponsorId) out.push("confirm", "revision", "reject");
  if (!isOwner && status === "pending_finance" && actor.role === "finance") out.push("forward", "revision", "reject");
  if (!isOwner && status === "pending_stakeholder" && actor.role === "stakeholder") out.push("approve", "reject");
  // Pembayaran dicatat oleh Finance, HR, atau Stakeholder (wajib upload bukti transfer), bukan pemilik.
  if (!isOwner && status === "approved" && actor.role !== "employee" && actor.role !== "external") out.push("mark_paid");
  return out;
}

/** Boleh menolak/memulihkan baris tertentu? Hanya peninjau di tahapnya (PIC, Finance, Stakeholder), bukan pemilik. */
export function canReviewReimburseItems(actor: Actor, ownerId: string, status: ReimbursementStatus, sponsorId?: string | null): boolean {
  if (actor.id === ownerId) return false;
  return (status === "pending_sponsor" && !!sponsorId && actor.id === sponsorId)
    || (status === "pending_finance" && actor.role === "finance")
    || (status === "pending_stakeholder" && actor.role === "stakeholder");
}

export const leaveStatusLabel: Record<ApprovalStatus, string> = {
  pending_hr: "Waiting for HR review",
  pending_stakeholder: "Forwarded to Stakeholder",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const reimburseStatusLabel: Record<ReimbursementStatus, string> = {
  pending_sponsor: "Waiting for PIC confirmation",
  pending_finance: "Waiting for Finance review",
  revision: "Needs revision",
  pending_stakeholder: "Waiting for Stakeholder approval",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};
