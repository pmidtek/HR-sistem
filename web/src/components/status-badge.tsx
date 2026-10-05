import { leaveStatusLabel, reimburseStatusLabel } from "@/lib/calc/approval";
import type { ApprovalStatus, PayrollRunStatus, ProjectStatus, ReimbursementStatus } from "@/lib/types";
import { Badge, type BadgeTone } from "./ui/display";

const approvalTone: Record<ApprovalStatus, BadgeTone> = {
  pending_hr: "warning",
  pending_stakeholder: "brand",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return <Badge tone={approvalTone[status]} dot>{leaveStatusLabel[status]}</Badge>;
}

const reimburseTone: Record<ReimbursementStatus, BadgeTone> = {
  pending_finance: "warning",
  revision: "danger",
  pending_stakeholder: "brand",
  approved: "success",
  rejected: "danger",
  paid: "neutral",
};

export function ReimburseBadge({ status }: { status: ReimbursementStatus }) {
  return <Badge tone={reimburseTone[status]} dot>{reimburseStatusLabel[status]}</Badge>;
}

export const payrollStatusLabel: Record<PayrollRunStatus, string> = {
  draft: "Draf",
  pending: "Menunggu Approval",
  returned: "Dikembalikan",
  approved: "Disetujui",
  transferred: "Sudah Ditransfer",
};

const payrollTone: Record<PayrollRunStatus, BadgeTone> = {
  draft: "neutral",
  pending: "brand",
  returned: "danger",
  approved: "success",
  transferred: "neutral",
};

export function PayrollBadge({ status }: { status: PayrollRunStatus }) {
  return <Badge tone={payrollTone[status]} dot>{payrollStatusLabel[status]}</Badge>;
}

export const projectStatusLabel: Record<ProjectStatus, string> = {
  not_started: "Belum Mulai",
  ongoing: "Ongoing",
  review: "Review/UAT",
  done: "Selesai",
  on_hold: "On Hold",
  cancelled: "Batal",
};

const projectTone: Record<ProjectStatus, BadgeTone> = {
  not_started: "neutral",
  ongoing: "brand",
  review: "warning",
  done: "success",
  on_hold: "neutral",
  cancelled: "danger",
};

export function ProjectBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={projectTone[status]} dot>{projectStatusLabel[status]}</Badge>;
}
