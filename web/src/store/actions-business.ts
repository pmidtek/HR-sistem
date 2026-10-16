/** Mutasi untuk sales, project, payroll, dan notifikasi (simulasi endpoint). */
import type { Actor } from "@/lib/calc/approval";
import type { PayrollRunStatus, User } from "@/lib/types";
import { ActionError } from "./actions";
import { newId, nowIso, type DataState } from "./state";

const payrollFlow: Record<string, { from: PayrollRunStatus[]; to: PayrollRunStatus; role: Actor["role"] }> = {
  submit: { from: ["draft", "returned"], to: "pending", role: "finance" },
  approve: { from: ["pending"], to: "approved", role: "stakeholder" },
  return: { from: ["pending"], to: "returned", role: "stakeholder" },
  transfer: { from: ["approved"], to: "transferred", role: "finance" },
};

export type PayrollAction = keyof typeof payrollFlow;

export function actOnPayroll(s: DataState, runId: string, action: PayrollAction, actor: Actor, today: string, note?: string): DataState {
  const run = s.payrollRuns.find((r) => r.id === runId);
  const flow = payrollFlow[action];
  if (!run || !flow) throw new ActionError("Payroll tidak ditemukan.");
  if (actor.role !== flow.role || !flow.from.includes(run.status)) throw new ActionError("Anda tidak berhak melakukan aksi ini.");
  if (action === "return" && !note?.trim()) throw new ActionError("Catatan wajib diisi saat mengembalikan payroll.");
  const updated = {
    ...run, status: flow.to,
    approvedBy: flow.to === "approved" ? actor.id : run.approvedBy,
    approvedAt: flow.to === "approved" ? today : run.approvedAt,
    logs: [...run.logs, { at: nowIso(), byUserId: actor.id, from: run.status, to: flow.to, note }],
  };
  const recipients =
    action === "submit" ? s.users.filter((u) => u.role === "stakeholder").map((u) => u.id)
    : action === "approve" ? s.users.filter((u) => u.active).map((u) => u.id)
    : action === "return" ? s.users.filter((u) => u.role === "finance").map((u) => u.id) : [];
  const message: Record<PayrollAction, [string, string, string]> = {
    submit: ["Payroll menunggu approval", `Payroll ${run.period} diajukan oleh Finance.`, "/payroll"],
    approve: ["Slip gaji tersedia", `Slip gaji periode ${run.period} sudah bisa dilihat dan diunduh.`, "/payslips"],
    return: ["Payroll dikembalikan", `Payroll ${run.period} dikembalikan. Catatan: ${note ?? "-"}`, "/payroll"],
    transfer: ["", "", ""],
  };
  const [title, body, href] = message[action];
  const notes = recipients
    .filter((id) => id !== actor.id)
    .map((userId) => ({ id: newId("n"), userId, title, body, href, createdAt: nowIso(), read: false }));
  return { ...s, payrollRuns: s.payrollRuns.map((r) => (r.id === runId ? updated : r)), notifications: [...notes, ...s.notifications] };
}

export function markNotificationsRead(s: DataState, userId: string, ids?: string[]): DataState {
  return {
    ...s,
    notifications: s.notifications.map((n) =>
      n.userId === userId && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n,
    ),
  };
}

type MasterKey = "holidays" | "activityCodes" | "leaveTypes" | "reimbursementCategories" | "teams";

/** Simpan master data dari halaman Pengaturan (nanti: koleksi Directus masing-masing). */
export function saveMaster<K extends MasterKey>(s: DataState, key: K, items: DataState[K]): DataState {
  return { ...s, [key]: items };
}

export function saveSettings<K extends keyof DataState["settings"]>(s: DataState, key: K, value: DataState["settings"][K]): DataState {
  return { ...s, settings: { ...s.settings, [key]: value } };
}

export function saveUser(s: DataState, user: Omit<User, "id" | "employeeCode"> & { id?: string }): DataState {
  if (!user.name.trim() || !user.email.includes("@")) throw new ActionError("Name and a valid email are required.");
  if (s.users.some((u) => u.email.toLowerCase() === user.email.toLowerCase() && u.id !== user.id)) {
    throw new ActionError("This email is already used by another employee.");
  }
  if (user.role === "external") {
    if (!user.external?.sponsorId) throw new ActionError("Externals need an internal PIC.");
    if (!user.external.accessUntil) throw new ActionError("Set when the external's access ends.");
    if (user.external.sponsorId === user.id) throw new ActionError("An external can't be their own PIC.");
  }
  const external = user.role === "external" ? user.external ?? null : null;
  // Rekening tidak diubah lewat form ini (punya alur verifikasi sendiri, lihat actions-bank.ts).
  if (user.id) return { ...s, users: s.users.map((u) => (u.id === user.id ? { ...u, ...user, external, bankAccount: u.bankAccount, id: u.id } : u)) };
  const prefix = user.role === "external" ? "EXT-" : "EMP-";
  const max = s.users.filter((u) => u.employeeCode.startsWith(prefix)).reduce((m, u) => Math.max(m, Number(u.employeeCode.slice(4))), 0);
  const created: User = { ...user, external, bankAccount: null, id: newId("u"), employeeCode: `${prefix}${String(max + 1).padStart(4, "0")}` };
  if (user.role === "external") return { ...s, users: [...s.users, created] };
  const balances = s.leaveTypes
    .filter((t) => t.deductsBalance && t.quotaDays !== null)
    .map((t) => ({ userId: created.id, leaveTypeId: t.id, year: 2026, quota: t.quotaDays ?? 0, used: 0 }));
  return { ...s, users: [...s.users, created], leaveBalances: [...s.leaveBalances, ...balances] };
}
