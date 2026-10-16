/**
 * Mutasi reimburse (pure). Simulasi custom endpoint Directus: status hanya berubah lewat fungsi ini,
 * dan setiap transisi dicatat ke logs.
 */
import {
  allowedReimburseActions,
  canReviewReimburseItems,
  reimburseStatusLabel,
  reimburseTransitions,
  type Actor,
  type ReimburseAction,
} from "@/lib/calc/approval";
import { activeItems, claimTotal, estimatedPayDate, nextClaimNumber, validateReimburseRow, type ReimburseRowInput } from "@/lib/calc/reimburse";
import { formatDayShort, formatRupiah } from "@/lib/format";
import type { Reimbursement, ReimbursePayment } from "@/lib/types";
import { ActionError, idsByRole, nameOf, notify } from "./actions";
import { newId, nowIso, type DataState } from "./state";

function checkRows(s: DataState, rows: ReimburseRowInput[], today: string) {
  if (rows.length === 0) throw new ActionError("Fill in at least 1 row.");
  const maxAge = s.settings.reimburse.maxReceiptAgeDays;
  if (rows.some((r) => Object.keys(validateReimburseRow(r, today, maxAge)).length > 0)) throw new ActionError("Some rows are incomplete or too old.");
}

/** PIC internal untuk pengajuan external (null untuk pegawai biasa). */
export function sponsorOf(s: DataState, userId: string): string | null {
  const u = s.users.find((x) => x.id === userId);
  return u?.role === "external" ? (u.external?.sponsorId ?? null) : null;
}

/** Aksi yang boleh dilakukan actor pada satu pengajuan (sudah memperhitungkan PIC). */
export function reimburseActionsFor(s: DataState, actor: Actor, r: Reimbursement): ReimburseAction[] {
  return allowedReimburseActions(actor, r.userId, r.status, sponsorOf(s, r.userId));
}

/** Status awal: external menunggu konfirmasi PIC dulu, pegawai langsung ke Finance. */
function firstStatus(s: DataState, userId: string, today: string): "pending_sponsor" | "pending_finance" {
  const u = s.users.find((x) => x.id === userId);
  if (u?.role !== "external") return "pending_finance";
  if (!u.external?.sponsorId) throw new ActionError("Your account has no PIC yet. Ask HR to assign one.");
  if (u.external.accessUntil < today) throw new ActionError("Your access period has ended. Contact your PIC.");
  return "pending_sponsor";
}

function firstReviewers(s: DataState, userId: string, status: "pending_sponsor" | "pending_finance"): string[] {
  return status === "pending_sponsor" ? [sponsorOf(s, userId) ?? ""].filter(Boolean) : idsByRole(s, "finance");
}

const toItems = (rows: ReimburseRowInput[]) => rows.map((r) => ({ ...r, id: newId("rbi"), declined: null }));
const sum = (rows: ReimburseRowInput[]) => rows.reduce((t, r) => t + r.amount, 0);

/** Pegawai mengajukan satu grup reimburse berisi beberapa baris. */
export function submitReimburseClaim(s: DataState, userId: string, title: string, rows: ReimburseRowInput[], today: string): DataState {
  checkRows(s, rows, today);
  const status = firstStatus(s, userId, today);
  const at = nowIso();
  const created: Reimbursement = {
    id: newId("rb"),
    number: nextClaimNumber(s.reimbursements.map((r) => r.number), today),
    userId,
    title: title.trim() || `Reimbursement (${rows.length} items)`,
    submittedAt: today,
    items: toItems(rows),
    status,
    paidAt: null,
    payment: null,
    logs: [{ at, byUserId: userId, from: null, to: status }],
  };
  return {
    ...s,
    reimbursements: [created, ...s.reimbursements],
    notifications: notify(
      s, firstReviewers(s, userId, status).filter((id) => id !== userId),
      status === "pending_sponsor" ? "Please confirm a reimbursement" : "New reimbursement",
      `${nameOf(s, userId)}${status === "pending_sponsor" ? " (external)" : ""} submitted ${created.number} (${rows.length} items, ${formatRupiah(sum(rows))}).${status === "pending_sponsor" ? " You are the PIC: confirm the expenses are real before Finance reviews them." : ""}`,
      status === "pending_sponsor" ? `/reimbursements?claim=${created.id}` : "/approvals",
    ),
  };
}

/** Pemilik memperbaiki pengajuan yang diminta revisi, lalu dikirim ulang ke Finance. */
export function reviseReimburseClaim(s: DataState, id: string, actor: Actor, title: string, rows: ReimburseRowInput[], today: string): DataState {
  const req = s.reimbursements.find((r) => r.id === id);
  if (!req) throw new ActionError("Reimbursement not found.");
  if (!reimburseActionsFor(s, actor, req).includes("resubmit")) throw new ActionError("This claim can no longer be edited.");
  checkRows(s, rows, today);
  const status = firstStatus(s, req.userId, today);
  const updated: Reimbursement = {
    ...req, title: title.trim() || req.title, items: toItems(rows), status,
    logs: [...req.logs, { at: nowIso(), byUserId: actor.id, from: req.status, to: status, note: "Revised and resubmitted." }],
  };
  return {
    ...s,
    reimbursements: s.reimbursements.map((r) => (r.id === id ? updated : r)),
    notifications: notify(s, firstReviewers(s, req.userId, status), "Reimbursement revised", `${nameOf(s, req.userId)} resubmitted ${req.number}.`, status === "pending_sponsor" ? `/reimbursements?claim=${req.id}` : "/approvals"),
  };
}

/** Peninjau menolak satu baris (dengan alasan) atau memulihkannya (note = null). */
export function setReimburseItemDecline(s: DataState, id: string, itemId: string, note: string | null, actor: Actor): DataState {
  const req = s.reimbursements.find((r) => r.id === id);
  if (!req) throw new ActionError("Reimbursement not found.");
  if (!canReviewReimburseItems(actor, req.userId, req.status, sponsorOf(s, req.userId))) throw new ActionError("You are not allowed to review this item.");
  if (note !== null && !note.trim()) throw new ActionError("A reason is required.");
  const items = req.items.map((i) => (i.id === itemId ? { ...i, declined: note === null ? null : { note: note.trim(), byUserId: actor.id } } : i));
  return { ...s, reimbursements: s.reimbursements.map((r) => (r.id === id ? { ...req, items } : r)) };
}

export function actOnReimburse(s: DataState, id: string, action: Exclude<ReimburseAction, "mark_paid" | "resubmit">, actor: Actor, note?: string): DataState {
  const req = s.reimbursements.find((r) => r.id === id);
  if (!req) throw new ActionError("Reimbursement not found.");
  if (!reimburseActionsFor(s, actor, req).includes(action)) throw new ActionError("You are not allowed to do this.");
  if ((action === "revision" || action === "reject") && !note?.trim()) throw new ActionError("A reason is required.");
  if ((action === "confirm" || action === "forward" || action === "approve") && activeItems(req).length === 0) throw new ActionError("All items are declined. Use Reject to reject the claim.");
  const to = reimburseTransitions[action].to;
  const declinedCount = req.items.length - activeItems(req).length;
  const autoNote = declinedCount > 0 && (action === "confirm" || action === "forward" || action === "approve") ? `${declinedCount} item(s) declined.` : undefined;
  const updated: Reimbursement = { ...req, status: to, logs: [...req.logs, { at: nowIso(), byUserId: actor.id, from: req.status, to, note: note?.trim() || autoNote }] };
  // Peninjau lain (Stakeholder/Finance) dapat notifikasi umum; pemilik dapat notifikasi pribadi yang jelas alasannya.
  const reviewers = action === "confirm" ? idsByRole(s, "finance")
    : action === "forward" ? idsByRole(s, "stakeholder")
    : action === "approve" || req.status === "pending_stakeholder" ? idsByRole(s, "finance") : [];
  const body = `${req.number} by ${nameOf(s, req.userId)} is now "${reimburseStatusLabel[to]}" (${formatRupiah(claimTotal(updated))}).${note ? ` Reason: ${note}` : ""}`;
  const own = ownerNotice(s, updated, action, nameOf(s, actor.id), note?.trim());
  const afterReviewers = notify(s, reviewers.filter((r) => r !== actor.id && r !== req.userId), `Reimbursement: ${reimburseStatusLabel[to]}`, body, action === "forward" ? "/approvals" : "/reimburse-recap");
  return {
    ...s,
    reimbursements: s.reimbursements.map((r) => (r.id === id ? updated : r)),
    notifications: notify({ ...s, notifications: afterReviewers }, [req.userId], own.title, own.body, `/reimbursements?claim=${req.id}`),
  };
}

/** Notifikasi pribadi untuk pemilik: apa yang terjadi, oleh siapa, alasan, baris yang ditolak, dan langkah berikutnya. */
export function ownerNotice(s: DataState, r: Reimbursement, action: "confirm" | "forward" | "approve" | "revision" | "reject", by: string, note?: string): { title: string; body: string } {
  const declined = r.items.filter((i) => i.declined);
  const declinedText = declined.length === 0 ? "" : ` ${declined.length} item(s) declined: ${declined.map((i) => `${i.description} (${formatRupiah(i.amount)}): ${i.declined?.note}`).join("; ")}.`;
  const total = formatRupiah(claimTotal(r));
  switch (action) {
    case "reject":
      return { title: "Your reimbursement was rejected", body: `${r.number} was rejected by ${by}. Reason: ${note ?? "-"}` };
    case "revision":
      return { title: "Your reimbursement needs revision", body: `${by} asked you to fix ${r.number}. Reason: ${note ?? "-"} Open the claim and click "Fix & resubmit".` };
    case "confirm":
      return {
        title: declined.length > 0 ? "Your PIC confirmed part of your reimbursement" : "Your PIC confirmed your reimbursement",
        body: `${r.number} was confirmed by ${by} and is now with Finance (${total}).${declinedText}`,
      };
    case "forward":
      return {
        title: declined.length > 0 ? "Some items in your reimbursement were declined" : "Your reimbursement passed Finance review",
        body: `${r.number} was reviewed by ${by} and forwarded for Stakeholder approval (${total}).${declinedText}`,
      };
    case "approve": {
      const holidays = new Set(s.holidays.map((h) => h.date));
      const pay = formatDayShort(estimatedPayDate(r.submittedAt, s.settings.reimburse, holidays));
      return {
        title: declined.length > 0 ? "Your reimbursement was approved (partially)" : "Your reimbursement was approved",
        body: `${r.number} was approved by ${by}: ${total} will be paid, estimated ${pay}.${declinedText}`,
      };
    }
  }
}

/** Finance membayar satu atau beberapa pengajuan sekaligus (satu grup = dibayar penuh). */
export function payReimburseClaims(s: DataState, ids: string[], payment: Omit<ReimbursePayment, "byUserId" | "toAccount">, actor: Actor): DataState {
  if (ids.length === 0) throw new ActionError("Select at least 1 claim.");
  if (!payment.date) throw new ActionError("Payment date is required.");
  if (payment.proofFiles.length === 0) throw new ActionError("Upload the payment proof first.");
  const at = nowIso();
  let next = s;
  for (const id of ids) {
    const req = next.reimbursements.find((r) => r.id === id);
    if (!req) throw new ActionError("Reimbursement not found.");
    if (!reimburseActionsFor(next, actor, req).includes("mark_paid")) throw new ActionError(`${req.number} cannot be paid yet.`);
    const acct = next.users.find((u) => u.id === req.userId)?.bankAccount ?? null;
    if (payment.method === "transfer" && next.settings.reimburse.requireVerifiedAccount && !acct?.verified) {
      throw new ActionError(`${req.number}: ${nameOf(next, req.userId)}'s bank account is not verified yet.`);
    }
    const updated: Reimbursement = {
      ...req, status: "paid", paidAt: payment.date,
      payment: { ...payment, byUserId: actor.id, toAccount: payment.method === "transfer" && acct ? { bankName: acct.bankName, accountNumber: acct.accountNumber, accountHolder: acct.accountHolder } : null },
      logs: [...req.logs, { at, byUserId: actor.id, from: req.status, to: "paid", note: payment.reference ? `Ref. ${payment.reference}` : undefined }],
    };
    next = {
      ...next,
      reimbursements: next.reimbursements.map((r) => (r.id === id ? updated : r)),
      notifications: notify(next, [req.userId], "Your reimbursement was paid", `${req.number} (${formatRupiah(claimTotal(req))}) has been paid${payment.method === "payroll" ? " via payroll" : " by bank transfer"}. Payment proof is attached.`, `/reimbursements?claim=${req.id}`),
    };
  }
  return next;
}
