/** Mutasi untuk sales, project, payroll, dan notifikasi (simulasi endpoint). */
import type { Actor } from "@/lib/calc/approval";
import type { Opportunity, OpportunityStage, PayrollRunStatus, Project, Task, User } from "@/lib/types";
import { STAGES } from "@/lib/mock/sales";
import { ActionError } from "./actions";
import { newId, nowIso, type DataState } from "./state";

function nextCode(prefix: "OP" | "PR", existing: string[], year: string): string {
  const yy = year.slice(2);
  const max = existing
    .filter((c) => c.startsWith(`${prefix}${yy}`))
    .reduce((m, c) => Math.max(m, Number(c.slice(4))), 0);
  return `${prefix}${yy}${String(max + 1).padStart(4, "0")}`;
}

export function saveOpportunity(s: DataState, opp: Omit<Opportunity, "id" | "code"> & { id?: string }, today: string): DataState {
  if (opp.stage === "lost" && !opp.lostReason?.trim()) throw new ActionError("Alasan kalah wajib diisi.");
  if (opp.id) {
    return { ...s, opportunities: s.opportunities.map((o) => (o.id === opp.id ? { ...o, ...opp, id: o.id } : o)) };
  }
  const code = nextCode("OP", s.opportunities.map((o) => o.code), today.slice(0, 4));
  return { ...s, opportunities: [{ ...opp, id: newId("o"), code }, ...s.opportunities] };
}

export function moveOpportunity(s: DataState, id: string, stage: OpportunityStage, lostReason?: string): DataState {
  if (stage === "lost" && !lostReason?.trim()) throw new ActionError("Alasan kalah wajib diisi.");
  const probability = STAGES.find((x) => x.id === stage)?.probability ?? 0;
  return {
    ...s,
    opportunities: s.opportunities.map((o) =>
      o.id === id ? { ...o, stage, probability, lostReason: stage === "lost" ? (lostReason ?? null) : null } : o,
    ),
  };
}

export function createProject(s: DataState, input: Omit<Project, "id" | "code" | "status">, today: string): DataState {
  if (input.opportunityId && s.projects.some((p) => p.opportunityId === input.opportunityId)) {
    throw new ActionError("Opportunity ini sudah punya project.");
  }
  const id = newId("p");
  const code = nextCode("PR", s.projects.map((p) => p.code), today.slice(0, 4));
  const project: Project = { ...input, id, code, status: "not_started" };
  const columns = ["Backlog", "To Do", "In Progress", "Review", "Done"].map((name, i) => ({
    id: `${id}-c${i}`, projectId: id, name, order: i, isDone: name === "Done",
  }));
  const notes = input.memberIds.map((userId) => ({
    id: newId("n"), userId, title: "Ditambahkan ke project", body: `Anda ditambahkan ke project ${code} — ${input.name}.`,
    href: `/projects/${id}`, createdAt: nowIso(), read: false,
  }));
  return {
    ...s,
    projects: [project, ...s.projects],
    boardColumns: [...s.boardColumns, ...columns],
    notifications: [...notes, ...s.notifications],
  };
}

export function saveTask(s: DataState, task: Omit<Task, "id"> & { id?: string }, actorId: string): DataState {
  if (task.id) return { ...s, tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, ...task, id: t.id } : t)) };
  const created: Task = { ...task, id: newId("task") };
  const project = s.projects.find((p) => p.id === task.projectId);
  const notes = task.assigneeId && task.assigneeId !== actorId
    ? [{ id: newId("n"), userId: task.assigneeId, title: "Task baru untuk Anda", body: `${task.title} (${project?.code ?? ""})`, href: `/projects/${task.projectId}`, createdAt: nowIso(), read: false }]
    : [];
  return { ...s, tasks: [...s.tasks, created], notifications: [...notes, ...s.notifications] };
}

export function moveTask(s: DataState, taskId: string, columnId: string): DataState {
  return { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, columnId } : t)) };
}

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

export function setProjectStatus(s: DataState, projectId: string, status: Project["status"]): DataState {
  return { ...s, projects: s.projects.map((p) => (p.id === projectId ? { ...p, status } : p)) };
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
  if (!user.name.trim() || !user.email.includes("@")) throw new ActionError("Nama dan email wajib diisi dengan benar.");
  if (s.users.some((u) => u.email.toLowerCase() === user.email.toLowerCase() && u.id !== user.id)) {
    throw new ActionError("Email sudah dipakai pegawai lain.");
  }
  if (user.id) return { ...s, users: s.users.map((u) => (u.id === user.id ? { ...u, ...user, id: u.id } : u)) };
  const max = s.users.reduce((m, u) => Math.max(m, Number(u.employeeCode.slice(4))), 0);
  const created: User = { ...user, id: newId("u"), employeeCode: `EMP-${String(max + 1).padStart(4, "0")}` };
  const balances = s.leaveTypes
    .filter((t) => t.deductsBalance && t.quotaDays !== null)
    .map((t) => ({ userId: created.id, leaveTypeId: t.id, year: 2026, quota: t.quotaDays ?? 0, used: 0 }));
  return { ...s, users: [...s.users, created], leaveBalances: [...s.leaveBalances, ...balances] };
}
