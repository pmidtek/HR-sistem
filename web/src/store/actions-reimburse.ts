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
import { activeItems, claimTotal, nextClaimNumber, validateReimburseRow, type ReimburseRowInput } from "@/lib/calc/reimburse";
import { formatRupiah } from "@/lib/format";
import type { Reimbursement, ReimbursePayment } from "@/lib/types";
import { ActionError, idsByRole, nameOf, notify } from "./actions";
import { newId, nowIso, type DataState } from "./state";

function checkRows(rows: ReimburseRowInput[], today: string) {
  if (rows.length === 0) throw new ActionError("Isi minimal 1 baris.");
  if (rows.some((r) => Object.keys(validateReimburseRow(r, today)).length > 0)) throw new ActionError("Masih ada baris yang belum lengkap.");
}

const toItems = (rows: ReimburseRowInput[]) => rows.map((r) => ({ ...r, id: newId("rbi"), declined: null }));
const sum = (rows: ReimburseRowInput[]) => rows.reduce((t, r) => t + r.amount, 0);

/** Pegawai mengajukan satu grup reimburse berisi beberapa baris. */
export function submitReimburseClaim(s: DataState, userId: string, title: string, rows: ReimburseRowInput[], today: string): DataState {
  checkRows(rows, today);
  const at = nowIso();
  const created: Reimbursement = {
    id: newId("rb"),
    number: nextClaimNumber(s.reimbursements.map((r) => r.number), today),
    userId,
    title: title.trim() || `Reimburse ${rows.length} transaksi`,
    submittedAt: today,
    items: toItems(rows),
    status: "pending_finance",
    paidAt: null,
    payment: null,
    logs: [{ at, byUserId: userId, from: null, to: "pending_finance" }],
  };
  return {
    ...s,
    reimbursements: [created, ...s.reimbursements],
    notifications: notify(s, idsByRole(s, "finance").filter((id) => id !== userId), "Reimburse baru", `${nameOf(s, userId)} mengajukan ${created.number} (${rows.length} baris, ${formatRupiah(sum(rows))}).`, "/approvals"),
  };
}

/** Pemilik memperbaiki pengajuan yang diminta revisi, lalu dikirim ulang ke Finance. */
export function reviseReimburseClaim(s: DataState, id: string, actor: Actor, title: string, rows: ReimburseRowInput[], today: string): DataState {
  const req = s.reimbursements.find((r) => r.id === id);
  if (!req) throw new ActionError("Reimburse tidak ditemukan.");
  if (!allowedReimburseActions(actor, req.userId, req.status).includes("resubmit")) throw new ActionError("Pengajuan ini tidak bisa diubah.");
  checkRows(rows, today);
  const updated: Reimbursement = {
    ...req, title: title.trim() || req.title, items: toItems(rows), status: "pending_finance",
    logs: [...req.logs, { at: nowIso(), byUserId: actor.id, from: req.status, to: "pending_finance", note: "Diperbaiki dan dikirim ulang." }],
  };
  return {
    ...s,
    reimbursements: s.reimbursements.map((r) => (r.id === id ? updated : r)),
    notifications: notify(s, idsByRole(s, "finance"), "Reimburse diperbaiki", `${nameOf(s, req.userId)} mengirim ulang ${req.number}.`, "/approvals"),
  };
}

/** Peninjau menolak satu baris (dengan alasan) atau memulihkannya (note = null). */
export function setReimburseItemDecline(s: DataState, id: string, itemId: string, note: string | null, actor: Actor): DataState {
  const req = s.reimbursements.find((r) => r.id === id);
  if (!req) throw new ActionError("Reimburse tidak ditemukan.");
  if (!canReviewReimburseItems(actor, req.userId, req.status)) throw new ActionError("Anda tidak berhak meninjau baris ini.");
  if (note !== null && !note.trim()) throw new ActionError("Alasan penolakan wajib diisi.");
  const items = req.items.map((i) => (i.id === itemId ? { ...i, declined: note === null ? null : { note: note.trim(), byUserId: actor.id } } : i));
  return { ...s, reimbursements: s.reimbursements.map((r) => (r.id === id ? { ...req, items } : r)) };
}

export function actOnReimburse(s: DataState, id: string, action: Exclude<ReimburseAction, "mark_paid" | "resubmit">, actor: Actor, note?: string): DataState {
  const req = s.reimbursements.find((r) => r.id === id);
  if (!req) throw new ActionError("Reimburse tidak ditemukan.");
  if (!allowedReimburseActions(actor, req.userId, req.status).includes(action)) throw new ActionError("Anda tidak berhak melakukan aksi ini.");
  if ((action === "revision" || action === "reject") && !note?.trim()) throw new ActionError("Alasan wajib diisi.");
  if ((action === "forward" || action === "approve") && activeItems(req).length === 0) throw new ActionError("Semua baris ditolak. Gunakan Tolak untuk menolak pengajuan.");
  const to = reimburseTransitions[action].to;
  const declinedCount = req.items.length - activeItems(req).length;
  const autoNote = declinedCount > 0 && (action === "forward" || action === "approve") ? `${declinedCount} baris ditolak.` : undefined;
  const updated: Reimbursement = { ...req, status: to, logs: [...req.logs, { at: nowIso(), byUserId: actor.id, from: req.status, to, note: note?.trim() || autoNote }] };
  const recipients = action === "forward" ? [...idsByRole(s, "stakeholder"), req.userId]
    : action === "approve" ? [req.userId, ...idsByRole(s, "finance")]
    : req.status === "pending_stakeholder" ? [req.userId, ...idsByRole(s, "finance")] : [req.userId];
  const body = `${req.number} milik ${nameOf(s, req.userId)} kini "${reimburseStatusLabel[to]}" (${formatRupiah(claimTotal(updated))}).${note ? ` Alasan: ${note}` : ""}`;
  return {
    ...s,
    reimbursements: s.reimbursements.map((r) => (r.id === id ? updated : r)),
    notifications: notify(s, recipients.filter((r) => r !== actor.id), `Reimburse: ${reimburseStatusLabel[to]}`, body, action === "forward" ? "/approvals" : "/reimbursements"),
  };
}

/** Finance membayar satu atau beberapa pengajuan sekaligus (satu grup = dibayar penuh). */
export function payReimburseClaims(s: DataState, ids: string[], payment: Omit<ReimbursePayment, "byUserId">, actor: Actor): DataState {
  if (ids.length === 0) throw new ActionError("Pilih minimal 1 pengajuan.");
  if (!payment.date) throw new ActionError("Tanggal bayar wajib diisi.");
  const at = nowIso();
  let next = s;
  for (const id of ids) {
    const req = next.reimbursements.find((r) => r.id === id);
    if (!req) throw new ActionError("Reimburse tidak ditemukan.");
    if (!allowedReimburseActions(actor, req.userId, req.status).includes("mark_paid")) throw new ActionError(`${req.number} belum bisa dibayar.`);
    const updated: Reimbursement = {
      ...req, status: "paid", paidAt: payment.date, payment: { ...payment, byUserId: actor.id },
      logs: [...req.logs, { at, byUserId: actor.id, from: req.status, to: "paid", note: payment.reference ? `Ref. ${payment.reference}` : undefined }],
    };
    next = {
      ...next,
      reimbursements: next.reimbursements.map((r) => (r.id === id ? updated : r)),
      notifications: notify(next, [req.userId], "Reimburse dibayar", `${req.number} sebesar ${formatRupiah(claimTotal(req))} sudah dibayar${payment.method === "payroll" ? " lewat payroll" : " via transfer"}.`, "/reimbursements"),
    };
  }
  return next;
}
