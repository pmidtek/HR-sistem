/**
 * Tipe domain. Nama mengikuti koleksi Directus yang direncanakan di BRIEF.md Bagian 13.
 * Tanggal: string "YYYY-MM-DD" (Asia/Jakarta). Jam: "HH:MM". Uang: integer Rupiah.
 */

import type { PayrollInput } from "./calc/payroll";

export type Role = "stakeholder" | "hr" | "finance" | "employee";

export type TeamKind = "sales" | "delivery" | "support";
export type Team = { id: string; name: string; kind: TeamKind };

export type User = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: Role;
  teamId: string;
  position: string;
  joinDate: string;
  active: boolean;
};

export type Holiday = { date: string; name: string };
export type ActivityCode = { id: string; name: string; active: boolean };

export type ProjectRefKind = "opportunity" | "project" | "internal";
export type ProjectRef = { code: string; name: string; kind: ProjectRefKind };

export type TimesheetEntry = {
  id: string;
  userId: string;
  date: string;
  projectCode: string;
  activityId: string;
  start: string;
  end: string;
  description: string;
  locked: boolean;
};

/** Status cuti & lembur. */
export type ApprovalStatus = "pending_hr" | "pending_stakeholder" | "approved" | "rejected" | "cancelled";

export type ApprovalLog = {
  at: string;
  byUserId: string;
  from: string | null;
  to: string;
  note?: string;
};

export type LeaveType = {
  id: string;
  name: string;
  /** Kuota hari kerja per tahun; null = tanpa batas. */
  quotaDays: number | null;
  deductsBalance: boolean;
  unpaid: boolean;
  /** Wajib lampiran jika lebih dari N hari (contoh: sakit > 1 hari). */
  attachmentAfterDays: number | null;
};

export type LeaveBalance = { userId: string; leaveTypeId: string; year: number; quota: number; used: number };

export type LeaveRequest = {
  id: string;
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string;
  status: ApprovalStatus;
  logs: ApprovalLog[];
};

export type OvertimeRequest = {
  id: string;
  userId: string;
  date: string;
  isHoliday: boolean;
  requestedMinutes: number;
  approvedMinutes: number | null;
  reason: string;
  status: ApprovalStatus;
  logs: ApprovalLog[];
};

export type ReimbursementStatus =
  | "pending_finance"
  | "revision"
  | "pending_stakeholder"
  | "approved"
  | "rejected"
  | "paid";

export type ReimbursementCategory = { id: string; name: string };

export type Reimbursement = {
  id: string;
  userId: string;
  date: string;
  categoryId: string;
  projectCode: string;
  amount: number;
  description: string;
  files: string[];
  status: ReimbursementStatus;
  paidAt: string | null;
  logs: ApprovalLog[];
};

export type PayrollRunStatus = "draft" | "pending" | "returned" | "approved" | "transferred";

export type PayslipLine = { label: string; amount: number; kind: "earning" | "deduction"; mandatory?: boolean };

export type Payslip = {
  id: string;
  number: string;
  runId: string;
  userId: string;
  /** Input perhitungan (termasuk input manual Finance) supaya slip bisa dihitung ulang saat draf. */
  input: PayrollInput;
  lines: PayslipLine[];
  overtimeDetails: { date: string; hours: number; multiplier: string; amount: number }[];
};

export type PayrollRun = {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollRunStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  logs: ApprovalLog[];
};

export type Company = {
  id: string;
  name: string;
  industry: string;
  website: string;
  contacts: { name: string; title: string; email: string; phone: string }[];
};

export type OpportunityStage = "lead" | "qualification" | "proposal" | "negotiation" | "won" | "lost";

export type Opportunity = {
  id: string;
  code: string;
  name: string;
  companyId: string;
  ownerId: string;
  value: number;
  stage: OpportunityStage;
  probability: number;
  expectedClose: string;
  lostReason: string | null;
};

export type ProjectStatus = "not_started" | "ongoing" | "review" | "done" | "on_hold" | "cancelled";

export type Project = {
  id: string;
  code: string;
  name: string;
  opportunityId: string | null;
  teamIds: string[];
  leadId: string;
  memberIds: string[];
  startDate: string;
  targetDate: string;
  status: ProjectStatus;
};

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type Task = {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  assigneeId: string | null;
  priority: TaskPriority;
  deadline: string | null;
  labels: string[];
  checklist: { text: string; done: boolean }[];
};

export type BoardColumn = { id: string; projectId: string; name: string; order: number; isDone: boolean };

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
};
