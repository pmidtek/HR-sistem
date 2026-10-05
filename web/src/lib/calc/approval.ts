import type { ApprovalStatus, ReimbursementStatus, Role } from "../types";

/**
 * Aturan transisi status approval. Nanti dipakai juga di custom endpoint Directus
 * (status hanya boleh berubah lewat endpoint, bukan update field langsung).
 */

export type Actor = { id: string; role: Role };

export type LeaveAction = "forward" | "reject" | "approve" | "cancel";
export type ReimburseAction = "forward" | "revision" | "reject" | "approve" | "resubmit" | "mark_paid";

export const leaveTransitions: Record<LeaveAction, { from: ApprovalStatus[]; to: ApprovalStatus }> = {
  forward: { from: ["pending_hr"], to: "pending_stakeholder" },
  reject: { from: ["pending_hr", "pending_stakeholder"], to: "rejected" },
  approve: { from: ["pending_stakeholder"], to: "approved" },
  cancel: { from: ["pending_hr", "pending_stakeholder", "approved"], to: "cancelled" },
};

export const reimburseTransitions: Record<ReimburseAction, { from: ReimbursementStatus[]; to: ReimbursementStatus }> = {
  forward: { from: ["pending_finance"], to: "pending_stakeholder" },
  revision: { from: ["pending_finance"], to: "revision" },
  reject: { from: ["pending_finance", "pending_stakeholder"], to: "rejected" },
  approve: { from: ["pending_stakeholder"], to: "approved" },
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

/** Aksi yang boleh dilakukan actor pada reimburse. */
export function allowedReimburseActions(actor: Actor, ownerId: string, status: ReimbursementStatus): ReimburseAction[] {
  const isOwner = actor.id === ownerId;
  const out: ReimburseAction[] = [];
  if (isOwner && status === "revision") out.push("resubmit");
  if (!isOwner && status === "pending_finance" && actor.role === "finance") out.push("forward", "revision", "reject");
  if (!isOwner && status === "pending_stakeholder" && actor.role === "stakeholder") out.push("approve", "reject");
  if (status === "approved" && actor.role === "finance") out.push("mark_paid");
  return out;
}

export const leaveStatusLabel: Record<ApprovalStatus, string> = {
  pending_hr: "Menunggu Review HR",
  pending_stakeholder: "Diteruskan ke Stakeholder",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

export const reimburseStatusLabel: Record<ReimbursementStatus, string> = {
  pending_finance: "Menunggu Review Finance",
  revision: "Perlu Revisi",
  pending_stakeholder: "Menunggu Keputusan Stakeholder",
  approved: "Disetujui",
  rejected: "Ditolak",
  paid: "Sudah Dibayar",
};
