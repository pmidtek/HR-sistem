/**
 * Perhitungan slip gaji bulanan. Semua tarif diambil dari pengaturan (CMS), tidak di-hardcode.
 * PERINGATAN: rumus pajak & BPJS WAJIB diverifikasi Finance/konsultan pajak sebelum go-live.
 * Belum termasuk: perhitungan ulang PPh 21 setahun penuh di bulan Desember.
 */
import type { AppSettings, BpjsRate, TerCategory, TerRate } from "../settings-types";
import type { PayslipLine } from "../types";
import { overtimePay } from "./overtime";

export type OvertimeDay = { date: string; minutes: number; isHoliday: boolean };

export type PayrollInput = {
  base: number;
  allowances: { name: string; amount: number }[];
  ptkp: string;
  bpjsEnrolled: boolean;
  overtimeDays: OvertimeDay[];
  reimburse: number;
  otherIncome: { name: string; amount: number }[];
  unpaidLeaveDays: number;
  workdaysInPeriod: number;
  otherDeductions: { name: string; amount: number }[];
};

export type PayrollResult = {
  lines: PayslipLine[];
  overtimeDetails: { date: string; hours: number; multiplier: string; amount: number }[];
  totalEarnings: number;
  totalDeductions: number;
  takeHomePay: number;
  employerContributions: { name: string; amount: number }[];
  terCategory: TerCategory;
  terRateBps: number;
  grossForTax: number;
};

/** Kategori TER dari status PTKP (PP 58/2023). */
export function terCategory(ptkp: string): TerCategory {
  if (["TK/0", "TK/1", "K/0"].includes(ptkp)) return "A";
  if (["TK/2", "TK/3", "K/1", "K/2"].includes(ptkp)) return "B";
  return "C";
}

export function terRate(rates: TerRate[], category: TerCategory, gross: number): number {
  const row = rates.find((r) => r.category === category && gross >= r.minIncome && (r.maxIncome === null || gross <= r.maxIncome));
  return row?.rateBps ?? 0;
}

/** Porsi BPJS (Rupiah, dibulatkan) dari basis upah dengan batas upah. */
export function bpjsAmount(rate: BpjsRate, wage: number, side: "employee" | "employer"): number {
  const basis = rate.wageCap === null ? wage : Math.min(wage, rate.wageCap);
  const bps = side === "employee" ? rate.employeeBps : rate.employerBps;
  return Math.round((basis * bps) / 10_000);
}

const pct = (bps: number) => `${(bps / 100).toLocaleString("id-ID")}%`;

export function computePayslip(input: PayrollInput, settings: AppSettings): PayrollResult {
  const fixedAllowance = input.allowances.reduce((s, a) => s + a.amount, 0);
  const fixedWage = input.base + fixedAllowance;

  const overtimeDetails = input.overtimeDays.map((d) => {
    const amount = overtimePay(d.minutes, d.isHoliday, fixedWage, settings.overtime);
    const multiplier = settings.overtime.mode === "flat" ? "flat" : d.isHoliday ? "2 / 3 / 4" : "1,5 / 2";
    return { date: d.date, hours: d.minutes / 60, multiplier, amount };
  });
  const overtime = overtimeDetails.reduce((s, d) => s + d.amount, 0);
  const otherIncome = input.otherIncome.reduce((s, x) => s + x.amount, 0);

  const bpjs = input.bpjsEnrolled ? settings.bpjs : [];
  const employeeBpjs = bpjs.filter((b) => b.employeeBps > 0).map((b) => ({ rate: b, amount: bpjsAmount(b, fixedWage, "employee") }));
  const employerContributions = bpjs.filter((b) => b.employerBps > 0).map((b) => ({ name: b.name, amount: bpjsAmount(b, fixedWage, "employer") }));
  // Premi yang dibayar pemberi kerja (Kesehatan, JKK, JKM) menambah penghasilan bruto untuk PPh 21.
  const taxableEmployerPremi = employerContributions
    .filter((c) => ["kes", "jkk", "jkm"].includes(bpjs.find((b) => b.name === c.name)?.id ?? ""))
    .reduce((s, c) => s + c.amount, 0);

  const unpaidLeave = input.workdaysInPeriod > 0 ? Math.round((input.base / input.workdaysInPeriod) * input.unpaidLeaveDays) : 0;
  const grossForTax = fixedWage + overtime + otherIncome + taxableEmployerPremi - unpaidLeave;
  const category = terCategory(input.ptkp);
  const rateBps = terRate(settings.ter, category, grossForTax);
  const pph21 = Math.round((grossForTax * rateBps) / 10_000);

  const lines: PayslipLine[] = [
    { label: "Gaji Pokok", amount: input.base, kind: "earning", mandatory: true },
    ...input.allowances.map((a) => ({ label: a.name, amount: a.amount, kind: "earning" as const })),
    { label: `Lembur (${overtimeDetails.reduce((s, d) => s + d.hours, 0).toLocaleString("id-ID")} jam)`, amount: overtime, kind: "earning" },
    { label: "Reimburse", amount: input.reimburse, kind: "earning" },
    ...input.otherIncome.map((x) => ({ label: x.name, amount: x.amount, kind: "earning" as const })),
    ...employeeBpjs.map(({ rate, amount }) => ({ label: `${rate.name} (${pct(rate.employeeBps)})`, amount, kind: "deduction" as const, mandatory: true })),
    { label: "PPh 21 (TER)", amount: pph21, kind: "deduction", mandatory: true },
    { label: "Cuti tanpa gaji", amount: unpaidLeave, kind: "deduction" },
    ...input.otherDeductions.map((x) => ({ label: x.name, amount: x.amount, kind: "deduction" as const })),
  ];
  const totalEarnings = lines.filter((l) => l.kind === "earning").reduce((s, l) => s + l.amount, 0);
  const totalDeductions = lines.filter((l) => l.kind === "deduction").reduce((s, l) => s + l.amount, 0);

  return {
    lines,
    overtimeDetails,
    totalEarnings,
    totalDeductions,
    takeHomePay: totalEarnings - totalDeductions,
    employerContributions,
    terCategory: category,
    terRateBps: rateBps,
    grossForTax,
  };
}

/** Periode payroll dari pengaturan: bulan kalender atau cutoff (mis. 26 bulan lalu s/d 25 bulan ini). */
export function payrollPeriod(period: string, mode: "calendar" | "cutoff", cutoffDay: number): { start: string; end: string } {
  const [y, m] = period.split("-").map(Number);
  const iso = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm - 1, dd)).toISOString().slice(0, 10);
  if (mode === "calendar") return { start: iso(y, m, 1), end: iso(y, m + 1, 0) };
  return { start: iso(y, m - 1, cutoffDay + 1), end: iso(y, m, cutoffDay) };
}
