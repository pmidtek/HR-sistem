import { computePayslip, type OvertimeDay, type PayrollInput } from "../calc/payroll";
import type { Notification, PayrollRun, Payslip } from "../types";
import { defaultSettings } from "./settings";

export const payrollRuns: PayrollRun[] = [
  { id: "pr-2026-08", period: "2026-08", periodStart: "2026-07-26", periodEnd: "2026-08-25", status: "transferred", approvedBy: "u1", approvedAt: "2026-08-27", logs: [] },
  { id: "pr-2026-09", period: "2026-09", periodStart: "2026-08-26", periodEnd: "2026-09-25", status: "transferred", approvedBy: "u1", approvedAt: "2026-09-27", logs: [] },
];

export type SalaryProfile = {
  base: number;
  allowances: { name: string; amount: number }[];
  ptkp: string;
  bpjsEnrolled: boolean;
  bank: string;
  npwp: string;
};

const std = (transport: number) => [{ name: "Tunj. Transport", amount: transport }, { name: "Tunj. Makan", amount: 600_000 }];

/** Profil gaji per user (mock; nanti dari salary_profiles + salary_allowances, diisi Finance). */
export const salaryProfiles: Record<string, SalaryProfile> = {
  u1: { base: 45_000_000, allowances: [{ name: "Tunj. Jabatan", amount: 5_000_000 }], ptkp: "K/2", bpjsEnrolled: true, bank: "BCA ****1001", npwp: "" },
  u10: { base: 40_000_000, allowances: [{ name: "Tunj. Jabatan", amount: 4_000_000 }], ptkp: "K/1", bpjsEnrolled: true, bank: "BCA ****1002", npwp: "" },
  u2: { base: 15_000_000, allowances: std(500_000), ptkp: "TK/0", bpjsEnrolled: true, bank: "Mandiri ****2003", npwp: "" },
  u3: { base: 16_000_000, allowances: std(500_000), ptkp: "K/0", bpjsEnrolled: true, bank: "BCA ****3004", npwp: "" },
  u4: { base: 10_000_000, allowances: std(500_000), ptkp: "K/1", bpjsEnrolled: true, bank: "BCA ****4521", npwp: "" },
  u8: { base: 9_000_000, allowances: std(500_000), ptkp: "TK/0", bpjsEnrolled: true, bank: "BNI ****8812", npwp: "" },
  u5: { base: 8_500_000, allowances: std(750_000), ptkp: "K/0", bpjsEnrolled: true, bank: "BCA ****5590", npwp: "" },
  u9: { base: 7_000_000, allowances: std(750_000), ptkp: "TK/0", bpjsEnrolled: true, bank: "BRI ****9031", npwp: "" },
  u6: { base: 14_000_000, allowances: std(500_000), ptkp: "K/1", bpjsEnrolled: true, bank: "BCA ****6677", npwp: "" },
  u7: { base: 9_500_000, allowances: std(500_000), ptkp: "TK/1", bpjsEnrolled: true, bank: "Mandiri ****7720", npwp: "" },
};

export function baseInput(userId: string, workdaysInPeriod: number): PayrollInput {
  const p = salaryProfiles[userId];
  return {
    base: p.base, allowances: p.allowances, ptkp: p.ptkp, bpjsEnrolled: p.bpjsEnrolled,
    overtimeDays: [], reimburse: 0, otherIncome: [], unpaidLeaveDays: 0, workdaysInPeriod, otherDeductions: [],
  };
}

export function slipNumber(period: string, seq: number): string {
  const [y, m] = period.split("-");
  return `SG/${y}/${m}/${String(seq).padStart(4, "0")}`;
}

function historicSlips(run: PayrollRun, extras: Record<string, { overtime?: OvertimeDay[]; reimburse?: number }>): Payslip[] {
  return Object.keys(salaryProfiles).map((userId, i) => {
    const input = { ...baseInput(userId, 22), overtimeDays: extras[userId]?.overtime ?? [], reimburse: extras[userId]?.reimburse ?? 0 };
    const r = computePayslip(input, defaultSettings);
    return { id: `${run.id}-${userId}`, number: slipNumber(run.period, i + 1), runId: run.id, userId, input, lines: r.lines, overtimeDetails: r.overtimeDetails };
  });
}

export const payslips: Payslip[] = [
  ...historicSlips(payrollRuns[0], { u4: { overtime: [{ date: "2026-08-12", minutes: 90, isHoliday: false }] } }),
  ...historicSlips(payrollRuns[1], {
    u4: { overtime: [{ date: "2026-09-08", minutes: 120, isHoliday: false }, { date: "2026-09-16", minutes: 60, isHoliday: false }], reimburse: 350_000 },
    u6: { reimburse: 1_250_000 },
  }),
];

export const notifications: Notification[] = [
  { id: "n1", userId: "u3", title: "New reimbursement", body: "Budi Santoso submitted RB-2610-001 (2 items, Rp139.850).", href: "/approvals", createdAt: "2026-10-06T19:00:00+07:00", read: false },
  { id: "n2", userId: "u1", title: "Reimbursement: Waiting for Stakeholder approval", body: "RB-2610-002 by Lina Kusuma is now \"Waiting for Stakeholder approval\" (Rp556.000).", href: "/approvals", createdAt: "2026-10-05T10:00:00+07:00", read: false },
  { id: "n3", userId: "u9", title: "Some items in your reimbursement were declined", body: "RB-2610-002 was reviewed by Dewi Lestari and forwarded for Stakeholder approval (Rp556.000). 1 item(s) declined: Cigarettes for guests (Rp85.000): Cigarettes are not a reimbursable entertainment expense.", href: "/reimbursements?claim=rb2", createdAt: "2026-10-05T10:00:00+07:00", read: false },
  { id: "n4", userId: "u5", title: "Your reimbursement was approved", body: "RB-2610-003 was approved by Rina Wijaya: Rp383.000 will be paid, estimated Wed, 7 Oct.", href: "/reimbursements?claim=rb14", createdAt: "2026-10-05T21:00:00+07:00", read: false },
  { id: "n5", userId: "u7", title: "Your reimbursement needs revision", body: "Dewi Lestari asked you to fix RB-2609-006. Reason: The toll receipt photo is blurry, please re-upload. Open the claim and click \"Fix & resubmit\".", href: "/reimbursements?claim=rb3", createdAt: "2026-09-29T10:00:00+07:00", read: false },
  { id: "n6", userId: "u6", title: "Your reimbursement was paid", body: "RB-2609-002 (Rp1.930.000) has been paid via payroll. Payment proof is attached.", href: "/reimbursements?claim=rb7", createdAt: "2026-09-25T10:00:00+07:00", read: true },
  { id: "n7", userId: "u6", title: "Your reimbursement was rejected", body: "RB-2606-002 was rejected by Dewi Lestari. Reason: Already covered by the client per contract.", href: "/reimbursements?claim=rb11", createdAt: "2026-06-12T10:00:00+07:00", read: true },
];
