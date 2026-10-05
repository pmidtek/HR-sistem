import { allowedLeaveActions, allowedReimburseActions, type Actor } from "@/lib/calc/approval";
import type { DataState } from "@/store/state";

export type PendingCounts = { leave: number; overtime: number; reimburse: number; payroll: number };

/** Jumlah pengajuan yang menunggu tindakan actor (review atau keputusan). */
export function pendingFor(s: DataState, actor: Actor): PendingCounts {
  const reviewable = (a: string[]) => a.some((x) => x !== "cancel");
  return {
    leave: s.leaveRequests.filter((r) => reviewable(allowedLeaveActions(actor, r.userId, r.status))).length,
    overtime: s.overtimeRequests.filter((r) => reviewable(allowedLeaveActions(actor, r.userId, r.status))).length,
    reimburse: s.reimbursements.filter((r) => {
      const acts = allowedReimburseActions(actor, r.userId, r.status);
      return acts.length > 0 && !acts.includes("resubmit") && !acts.includes("mark_paid");
    }).length,
    payroll: s.payrollRuns.filter((r) => actor.role === "stakeholder" && r.status === "pending").length,
  };
}

export function pendingCountFor(s: DataState, actor: Actor): number {
  const p = pendingFor(s, actor);
  return p.leave + p.overtime + p.reimburse + p.payroll;
}
