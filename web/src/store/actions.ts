/**
 * Mutasi state (pure). Ini simulasi sementara dari custom endpoint Directus.
 * Saat backend siap, setiap fungsi di sini diganti panggilan API dengan aturan yang sama.
 */
import {
  allowedLeaveActions,
  allowedReimburseActions,
  leaveStatusLabel,
  leaveTransitions,
  reimburseStatusLabel,
  reimburseTransitions,
  type Actor,
  type LeaveAction,
  type ReimburseAction,
} from "@/lib/calc/approval";
import type { ApprovalLog, LeaveRequest, Notification, OvertimeRequest, Reimbursement, TimesheetEntry } from "@/lib/types";
import { newId, nowIso, type DataState } from "./state";

export class ActionError extends Error {}

function notify(state: DataState, userIds: string[], title: string, body: string, href: string): Notification[] {
  const created = [...new Set(userIds)].map((userId) => ({
    id: newId("n"), userId, title, body, href, createdAt: nowIso(), read: false,
  }));
  return [...created, ...state.notifications];
}

const idsByRole = (s: DataState, role: Actor["role"]) => s.users.filter((u) => u.role === role).map((u) => u.id);
const nameOf = (s: DataState, id: string) => s.users.find((u) => u.id === id)?.name ?? "-";

export function saveTimesheetEntry(s: DataState, entry: TimesheetEntry): DataState {
  const existing = s.timesheet.find((e) => e.id === entry.id);
  if (existing?.locked) throw new ActionError("Entri sudah terkunci karena lembur disetujui.");
  const timesheet = existing ? s.timesheet.map((e) => (e.id === entry.id ? entry : e)) : [...s.timesheet, entry];
  return { ...s, timesheet };
}

export function deleteTimesheetEntry(s: DataState, id: string): DataState {
  if (s.timesheet.find((e) => e.id === id)?.locked) throw new ActionError("Entri terkunci tidak bisa dihapus.");
  return { ...s, timesheet: s.timesheet.filter((e) => e.id !== id) };
}

export function submitLeave(s: DataState, req: Omit<LeaveRequest, "id" | "status" | "logs">): DataState {
  const created: LeaveRequest = {
    ...req, id: newId("lv"), status: "pending_hr",
    logs: [{ at: nowIso(), byUserId: req.userId, from: null, to: "pending_hr" }],
  };
  return {
    ...s,
    leaveRequests: [created, ...s.leaveRequests],
    notifications: notify(s, idsByRole(s, "hr").filter((id) => id !== req.userId), "Pengajuan cuti baru", `${nameOf(s, req.userId)} mengajukan cuti ${req.workingDays} hari.`, "/approvals"),
  };
}

function applyBalance(s: DataState, req: LeaveRequest, delta: number): DataState["leaveBalances"] {
  const type = s.leaveTypes.find((t) => t.id === req.leaveTypeId);
  if (!type?.deductsBalance) return s.leaveBalances;
  return s.leaveBalances.map((b) =>
    b.userId === req.userId && b.leaveTypeId === req.leaveTypeId ? { ...b, used: b.used + delta } : b,
  );
}

export function actOnLeave(s: DataState, id: string, action: LeaveAction, actor: Actor, today: string, note?: string): DataState {
  const req = s.leaveRequests.find((r) => r.id === id);
  if (!req) throw new ActionError("Pengajuan tidak ditemukan.");
  if (!allowedLeaveActions(actor, req.userId, req.status, { startDate: req.startDate, today }).includes(action)) {
    throw new ActionError("Anda tidak berhak melakukan aksi ini.");
  }
  const to = leaveTransitions[action].to;
  const log: ApprovalLog = { at: nowIso(), byUserId: actor.id, from: req.status, to, note };
  const updated = { ...req, status: to, logs: [...req.logs, log] };
  let balances = s.leaveBalances;
  if (to === "approved") balances = applyBalance(s, req, req.workingDays);
  if (action === "cancel" && req.status === "approved") balances = applyBalance(s, req, -req.workingDays);

  const recipients = action === "forward" ? [...idsByRole(s, "stakeholder"), req.userId]
    : to === "approved" || (to === "rejected" && req.status === "pending_stakeholder") ? [req.userId, ...idsByRole(s, "hr")]
    : action === "cancel" ? idsByRole(s, "hr") : [req.userId];
  return {
    ...s,
    leaveBalances: balances,
    leaveRequests: s.leaveRequests.map((r) => (r.id === id ? updated : r)),
    notifications: notify(s, recipients.filter((r) => r !== actor.id), `Cuti: ${leaveStatusLabel[to]}`, `Cuti ${nameOf(s, req.userId)} kini berstatus "${leaveStatusLabel[to]}".${note ? ` Catatan: ${note}` : ""}`, action === "forward" ? "/approvals" : "/leave"),
  };
}

export function submitOvertime(s: DataState, req: Omit<OvertimeRequest, "id" | "status" | "logs" | "approvedMinutes">): DataState {
  if (s.overtimeRequests.some((r) => r.userId === req.userId && r.date === req.date && r.status !== "rejected" && r.status !== "cancelled")) {
    throw new ActionError("Lembur untuk tanggal ini sudah diajukan.");
  }
  const created: OvertimeRequest = {
    ...req, id: newId("ot"), status: "pending_hr", approvedMinutes: null,
    logs: [{ at: nowIso(), byUserId: req.userId, from: null, to: "pending_hr" }],
  };
  return {
    ...s,
    overtimeRequests: [created, ...s.overtimeRequests],
    notifications: notify(s, idsByRole(s, "hr").filter((id) => id !== req.userId), "Pengajuan lembur baru", `${nameOf(s, req.userId)} mengajukan lembur.`, "/approvals"),
  };
}

export function actOnOvertime(
  s: DataState, id: string, action: LeaveAction, actor: Actor, note?: string, approvedMinutes?: number,
): DataState {
  const req = s.overtimeRequests.find((r) => r.id === id);
  if (!req) throw new ActionError("Pengajuan tidak ditemukan.");
  if (!allowedLeaveActions(actor, req.userId, req.status).includes(action)) throw new ActionError("Anda tidak berhak melakukan aksi ini.");
  const changedHours = approvedMinutes !== undefined && approvedMinutes !== req.requestedMinutes;
  if (changedHours && !note?.trim()) throw new ActionError("Perubahan jumlah jam wajib disertai catatan.");
  const to = leaveTransitions[action].to;
  const updated: OvertimeRequest = {
    ...req, status: to,
    approvedMinutes: approvedMinutes ?? req.approvedMinutes ?? (to === "approved" ? req.requestedMinutes : null),
    logs: [...req.logs, { at: nowIso(), byUserId: actor.id, from: req.status, to, note }],
  };
  const timesheet = to === "approved"
    ? s.timesheet.map((e) => (e.userId === req.userId && e.date === req.date ? { ...e, locked: true } : e))
    : s.timesheet;
  const recipients = action === "forward" ? [...idsByRole(s, "stakeholder"), req.userId] : to === "approved" ? [req.userId, ...idsByRole(s, "hr")] : [req.userId];
  return {
    ...s, timesheet,
    overtimeRequests: s.overtimeRequests.map((r) => (r.id === id ? updated : r)),
    notifications: notify(s, recipients.filter((r) => r !== actor.id), `Lembur: ${leaveStatusLabel[to]}`, `Lembur ${nameOf(s, req.userId)} kini berstatus "${leaveStatusLabel[to]}".`, action === "forward" ? "/approvals" : "/overtime"),
  };
}

export function submitReimburse(s: DataState, req: Omit<Reimbursement, "id" | "status" | "logs" | "paidAt">): DataState {
  const created: Reimbursement = {
    ...req, id: newId("rb"), status: "pending_finance", paidAt: null,
    logs: [{ at: nowIso(), byUserId: req.userId, from: null, to: "pending_finance" }],
  };
  return {
    ...s,
    reimbursements: [created, ...s.reimbursements],
    notifications: notify(s, idsByRole(s, "finance").filter((id) => id !== req.userId), "Reimburse baru", `${nameOf(s, req.userId)} mengajukan reimburse.`, "/approvals"),
  };
}

export function actOnReimburse(s: DataState, id: string, action: ReimburseAction, actor: Actor, today: string, note?: string): DataState {
  const req = s.reimbursements.find((r) => r.id === id);
  if (!req) throw new ActionError("Reimburse tidak ditemukan.");
  if (!allowedReimburseActions(actor, req.userId, req.status).includes(action)) throw new ActionError("Anda tidak berhak melakukan aksi ini.");
  if ((action === "revision" || action === "reject") && !note?.trim()) throw new ActionError("Alasan wajib diisi.");
  const to = reimburseTransitions[action].to;
  const updated: Reimbursement = {
    ...req, status: to, paidAt: to === "paid" ? today : req.paidAt,
    logs: [...req.logs, { at: nowIso(), byUserId: actor.id, from: req.status, to, note }],
  };
  const recipients = action === "forward" ? [...idsByRole(s, "stakeholder"), req.userId]
    : action === "resubmit" ? idsByRole(s, "finance")
    : req.status === "pending_stakeholder" ? [req.userId, ...idsByRole(s, "finance")] : [req.userId];
  return {
    ...s,
    reimbursements: s.reimbursements.map((r) => (r.id === id ? updated : r)),
    notifications: notify(s, recipients.filter((r) => r !== actor.id), `Reimburse: ${reimburseStatusLabel[to]}`, `Reimburse ${nameOf(s, req.userId)} kini berstatus "${reimburseStatusLabel[to]}".${note ? ` Catatan: ${note}` : ""}`, action === "forward" ? "/approvals" : "/reimbursements"),
  };
}
