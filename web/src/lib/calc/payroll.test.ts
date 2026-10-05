import { describe, expect, it } from "vitest";
import { defaultSettings } from "../mock/settings";
import { bpjsAmount, computePayslip, payrollPeriod, terCategory, terRate, type PayrollInput } from "./payroll";

const s = defaultSettings;

const budi: PayrollInput = {
  base: 10_000_000,
  allowances: [{ name: "Tunj. Transport", amount: 500_000 }, { name: "Tunj. Makan", amount: 600_000 }],
  ptkp: "K/1",
  bpjsEnrolled: true,
  overtimeDays: [],
  reimburse: 0,
  otherIncome: [],
  unpaidLeaveDays: 0,
  workdaysInPeriod: 22,
  otherDeductions: [],
};

describe("kategori & tarif TER", () => {
  it("PTKP → kategori", () => {
    expect(terCategory("TK/0")).toBe("A");
    expect(terCategory("K/1")).toBe("B");
    expect(terCategory("K/3")).toBe("C");
  });

  it("cari tarif sesuai rentang bruto", () => {
    expect(terRate(s.ter, "A", 5_000_000)).toBe(0);
    expect(terRate(s.ter, "A", 10_000_000)).toBe(200);
    expect(terRate(s.ter, "B", 12_000_000)).toBe(300);
  });
});

describe("BPJS", () => {
  const kes = s.bpjs.find((b) => b.id === "kes");
  const jp = s.bpjs.find((b) => b.id === "jp");

  it("Kesehatan 1% karyawan dengan batas upah 12 juta", () => {
    expect(kes && bpjsAmount(kes, 11_100_000, "employee")).toBe(111_000);
    expect(kes && bpjsAmount(kes, 20_000_000, "employee")).toBe(120_000);
  });

  it("JP dibatasi batas upah dari pengaturan", () => {
    expect(jp && bpjsAmount(jp, 11_100_000, "employee")).toBe(105_474);
  });
});

describe("slip gaji", () => {
  it("tanpa lembur: take home = pendapatan − potongan", () => {
    const r = computePayslip(budi, s);
    expect(r.totalEarnings).toBe(11_100_000);
    expect(r.takeHomePay).toBe(r.totalEarnings - r.totalDeductions);
    expect(r.terCategory).toBe("B");
    // BPJS karyawan: Kes 111.000 + JHT 222.000 + JP 105.474
    const bpjs = r.lines.filter((l) => l.label.startsWith("BPJS")).reduce((a, l) => a + l.amount, 0);
    expect(bpjs).toBe(111_000 + 222_000 + 105_474);
  });

  it("lembur masuk pendapatan dan bruto pajak", () => {
    const r = computePayslip({ ...budi, overtimeDays: [{ date: "2026-10-01", minutes: 120, isHoliday: false }] }, s);
    expect(r.overtimeDetails[0].amount).toBe(Math.round((11_100_000 / 173) * 3.5));
    expect(r.totalEarnings).toBe(11_100_000 + r.overtimeDetails[0].amount);
  });

  it("cuti tanpa gaji memotong (gaji pokok ÷ hari kerja) × hari", () => {
    const r = computePayslip({ ...budi, unpaidLeaveDays: 2 }, s);
    expect(r.lines.find((l) => l.label === "Cuti tanpa gaji")?.amount).toBe(Math.round((10_000_000 / 22) * 2));
  });

  it("porsi perusahaan tidak memotong take home pay", () => {
    const r = computePayslip(budi, s);
    expect(r.employerContributions.length).toBeGreaterThan(0);
    expect(r.lines.some((l) => l.label.includes("JKK"))).toBe(false);
  });

  it("tidak ikut BPJS → tanpa potongan BPJS", () => {
    const r = computePayslip({ ...budi, bpjsEnrolled: false }, s);
    expect(r.lines.some((l) => l.label.startsWith("BPJS"))).toBe(false);
  });
});

describe("periode payroll", () => {
  it("bulan kalender", () => {
    expect(payrollPeriod("2026-02", "calendar", 25)).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("cutoff 26–25", () => {
    expect(payrollPeriod("2026-10", "cutoff", 25)).toEqual({ start: "2026-09-26", end: "2026-10-25" });
    expect(payrollPeriod("2026-01", "cutoff", 25)).toEqual({ start: "2025-12-26", end: "2026-01-25" });
  });
});
