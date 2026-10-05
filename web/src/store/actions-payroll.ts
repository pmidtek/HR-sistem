/** Generate & ubah draf payroll (simulasi endpoint Finance). */
import type { Actor } from "@/lib/calc/approval";
import { eachDay, isWeekend } from "@/lib/calc/dates";
import { computePayslip, payrollPeriod, type PayrollInput } from "@/lib/calc/payroll";
import { baseInput, salaryProfiles, slipNumber } from "@/lib/mock/payroll";
import type { Payslip } from "@/lib/types";
import { ActionError } from "./actions";
import type { DataState } from "./state";

export function generatePayroll(s: DataState, period: string, actor: Actor): DataState {
  if (actor.role !== "finance") throw new ActionError("Hanya Finance yang bisa generate payroll.");
  const existing = s.payrollRuns.find((r) => r.period === period);
  if (existing && existing.status !== "draft" && existing.status !== "returned") {
    throw new ActionError("Payroll periode ini sudah diajukan/disetujui dan terkunci.");
  }
  const { payroll, work } = s.settings;
  const { start, end } = payrollPeriod(period, payroll.periodMode, payroll.cutoffDay);
  const holidays = new Set(s.holidays.map((h) => h.date));
  const inPeriod = (d: string) => d >= start && d <= end;
  const workdays = eachDay(start, end).filter((d) => !isWeekend(d, work.workdaysPerWeek) && !holidays.has(d)).length;
  const runId = existing?.id ?? `pr-${period}`;

  const slips: Payslip[] = s.users
    .filter((u) => u.active && salaryProfiles[u.id])
    .map((u, i) => {
      const prev = s.payslips.find((p) => p.runId === runId && p.userId === u.id);
      const unpaidLeaveDays = s.leaveRequests
        .filter((r) => r.userId === u.id && r.status === "approved" && s.leaveTypes.find((t) => t.id === r.leaveTypeId)?.unpaid)
        .flatMap((r) => eachDay(r.startDate, r.endDate))
        .filter((d) => inPeriod(d) && !isWeekend(d, work.workdaysPerWeek) && !holidays.has(d)).length;
      const input: PayrollInput = {
        ...baseInput(u.id, workdays),
        overtimeDays: s.overtimeRequests
          .filter((r) => r.userId === u.id && r.status === "approved" && inPeriod(r.date))
          .map((r) => ({ date: r.date, minutes: r.approvedMinutes ?? r.requestedMinutes, isHoliday: r.isHoliday })),
        reimburse: payroll.reimburseViaPayroll
          ? s.reimbursements.filter((r) => r.userId === u.id && r.status === "approved").reduce((sum, r) => sum + r.amount, 0)
          : 0,
        unpaidLeaveDays,
        // Pertahankan input manual Finance saat generate ulang.
        otherIncome: prev?.input.otherIncome ?? [],
        otherDeductions: prev?.input.otherDeductions ?? [],
      };
      const r = computePayslip(input, s.settings);
      return { id: `${runId}-${u.id}`, number: slipNumber(period, i + 1), runId, userId: u.id, input, lines: r.lines, overtimeDetails: r.overtimeDetails };
    });

  const run = existing
    ? { ...existing, periodStart: start, periodEnd: end }
    : { id: runId, period, periodStart: start, periodEnd: end, status: "draft" as const, approvedBy: null, approvedAt: null, logs: [] };

  return {
    ...s,
    payrollRuns: existing ? s.payrollRuns.map((r) => (r.id === runId ? run : r)) : [...s.payrollRuns, run],
    payslips: [...s.payslips.filter((p) => p.runId !== runId), ...slips],
  };
}

/** Finance mengubah input manual (bonus, potongan lain) selama payroll masih draf. */
export function updatePayslipManual(
  s: DataState,
  slipId: string,
  manual: Pick<PayrollInput, "otherIncome" | "otherDeductions">,
  actor: Actor,
): DataState {
  const slip = s.payslips.find((p) => p.id === slipId);
  const run = s.payrollRuns.find((r) => r.id === slip?.runId);
  if (!slip || !run) throw new ActionError("Slip tidak ditemukan.");
  if (actor.role !== "finance") throw new ActionError("Hanya Finance yang bisa mengubah payroll.");
  if (run.status !== "draft" && run.status !== "returned") throw new ActionError("Payroll sudah terkunci.");
  const input = { ...slip.input, ...manual };
  const r = computePayslip(input, s.settings);
  return {
    ...s,
    payslips: s.payslips.map((p) => (p.id === slipId ? { ...p, input, lines: r.lines, overtimeDetails: r.overtimeDetails } : p)),
  };
}
