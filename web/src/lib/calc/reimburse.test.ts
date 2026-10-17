import { describe, expect, it } from "vitest";
import type { Reimbursement, ReimbursementItem, ReimbursementStatus } from "../types";
import {
  claimDeclined, claimGross, claimTotal, estimatedPayDate, inPeriod, isBlankRow, monthlyByEmployee, nextClaimNumber, reimbursed, selectedMonths, normalizeProjectCode, parseUsdCents,
  paymentState, recapBy, recapTotals, stageTotals, sumItemsBy, usdToIdr, validateReimburseRow, type ReimburseRowInput,
} from "./reimburse";

const row: ReimburseRowInput = { date: "2026-09-08", description: "Tiket Whoosh pergi", categoryId: "transportation", projectCode: null, amountUsdCents: null, amount: 300_000, files: [{ name: "a.jpg", url: null }, { name: "b.jpg", url: null }] };

function item(amount: number, declined = false, categoryId = "transportation"): ReimbursementItem {
  return { ...row, id: `i${amount}`, amount, categoryId, declined: declined ? { note: "Bukan biaya kantor", byUserId: "fin" } : null };
}
function claim(userId: string, status: ReimbursementStatus, items: ReimbursementItem[]): Reimbursement {
  return { id: `${userId}-${status}`, number: "RB", userId, title: "-", submittedAt: "2026-09-12", items, status, paidAt: null, payment: null, logs: [] };
}

describe("validasi baris reimburse", () => {
  it("kode project boleh kosong, bukti boleh lebih dari 1", () => {
    expect(validateReimburseRow(row, "2026-10-15")).toEqual({});
  });

  it("menandai kolom yang salah", () => {
    const e = validateReimburseRow({ ...row, date: "2026-10-20", amount: 0, files: [] }, "2026-10-15");
    expect(Object.keys(e).sort()).toEqual(["amount", "date", "files"]);
  });

  it("baris kosong dikenali supaya diabaikan", () => {
    expect(isBlankRow({ ...row, categoryId: "", amount: 0, description: " ", files: [] })).toBe(true);
    expect(isBlankRow(row)).toBe(false);
  });
});

describe("USD dan kode project", () => {
  it("parse USD ke sen", () => {
    expect(parseUsdCents("$22.00")).toBe(2200);
    expect(parseUsdCents("22,5")).toBe(2250);
    expect(parseUsdCents("")).toBeNull();
  });

  it("konversi ke Rupiah dibulatkan", () => {
    expect(usdToIdr(2200, 18_270)).toBe(401_940);
    expect(usdToIdr(199, 16_500)).toBe(32_835);
  });

  it("kode project dinormalisasi; kosong = null", () => {
    expect(normalizeProjectCode(" op260012 ")).toBe("OP260012");
    expect(normalizeProjectCode("others")).toBe("OTHERS");
    expect(normalizeProjectCode("  ")).toBeNull();
  });
});

describe("total pengajuan", () => {
  const c = claim("u1", "pending_stakeholder", [item(300_000), item(91_500), item(50_000, true)]);

  it("baris yang ditolak tidak ikut diganti", () => {
    expect(claimGross(c)).toBe(441_500);
    expect(claimTotal(c)).toBe(391_500);
    expect(claimDeclined(c)).toBe(50_000);
  });

  it("pengajuan ditolak seluruhnya = 0", () => {
    const r = claim("u1", "rejected", [item(100_000)]);
    expect(claimTotal(r)).toBe(0);
    expect(claimDeclined(r)).toBe(100_000);
  });
});

describe("status pembayaran & rekap", () => {
  it("hanya approved yang belum dibayar", () => {
    expect(paymentState("approved")).toBe("unpaid");
    expect(paymentState("paid")).toBe("paid");
    expect(paymentState("pending_finance")).toBe("none");
  });

  const list = [
    claim("u1", "paid", [item(100_000)]),
    claim("u1", "approved", [item(50_000), item(10_000, true)]),
    claim("u2", "pending_finance", [item(75_000)]),
    claim("u2", "rejected", [item(20_000, false, "meals")]),
  ];

  it("total per status", () => {
    expect(recapTotals(list)).toEqual({ count: 4, total: 255_000, inProcess: 75_000, unpaid: 50_000, paid: 100_000, declined: 30_000 });
  });

  it("rekap per pegawai", () => {
    const byUser = recapBy(list, (r) => r.userId);
    expect(byUser.get("u1")).toMatchObject({ count: 2, paid: 100_000, unpaid: 50_000, declined: 10_000 });
    expect(byUser.get("u2")).toMatchObject({ count: 2, inProcess: 75_000, declined: 20_000 });
  });

  it("per tahap untuk infografik", () => {
    const t = stageTotals(list);
    expect(t.paid).toEqual({ count: 1, amount: 100_000 });
    expect(t.unpaid).toEqual({ count: 1, amount: 50_000 });
    expect(t.rejected).toEqual({ count: 1, amount: 20_000 });
  });

  it("per kategori hanya baris yang diganti", () => {
    const byCat = sumItemsBy(list, (i) => i.categoryId);
    expect(byCat.get("transportation")).toEqual({ amount: 225_000, count: 3 });
    expect(byCat.has("meals")).toBe(false);
  });
});

describe("nomor pengajuan", () => {
  it("urut per bulan", () => {
    expect(nextClaimNumber(["RB-2610-001", "RB-2610-007", "RB-2609-012"], "2026-10-07")).toBe("RB-2610-008");
    expect(nextClaimNumber([], "2026-11-01")).toBe("RB-2611-001");
  });
});

describe("jadwal bayar (cutoff)", () => {
  const rule = { payDays: [3, 5], leadDays: 2 }; // Rabu & Jumat
  it("Senin → Rabu, Rabu → Jumat", () => {
    expect(estimatedPayDate("2026-10-12", rule)).toBe("2026-10-14");
    expect(estimatedPayDate("2026-10-14", rule)).toBe("2026-10-16");
  });
  it("Selasa → Jumat, Kamis/Jumat/akhir pekan → Rabu depan", () => {
    expect(estimatedPayDate("2026-10-13", rule)).toBe("2026-10-16");
    expect(estimatedPayDate("2026-10-15", rule)).toBe("2026-10-21");
    expect(estimatedPayDate("2026-10-16", rule)).toBe("2026-10-21");
    expect(estimatedPayDate("2026-10-18", rule)).toBe("2026-10-21");
  });
  it("hari libur dilewati", () => {
    expect(estimatedPayDate("2026-10-12", rule, new Set(["2026-10-14"]))).toBe("2026-10-16");
  });
});

describe("filter periode", () => {
  it("bulan, tahun, rentang", () => {
    expect(inPeriod("2026-09-08", { kind: "month", month: "2026-09" })).toBe(true);
    expect(inPeriod("2026-10-01", { kind: "month", month: "2026-09" })).toBe(false);
    expect(inPeriod("2026-01-01", { kind: "year", year: 2026 })).toBe(true);
    expect(inPeriod("2026-09-15", { kind: "range", from: "2026-09-01", to: "2026-09-15" })).toBe(true);
    expect(inPeriod("2026-09-16", { kind: "range", from: "2026-09-01", to: "2026-09-15" })).toBe(false);
    expect(inPeriod("2020-01-01", { kind: "all" })).toBe(true);
  });
});

describe("rekap bulanan per pegawai", () => {
  const at = (r: Reimbursement, submittedAt: string, id: string) => ({ ...r, id, submittedAt });

  it("bulan terpilih: satu bulan atau rentang, terbaru di depan", () => {
    expect(selectedMonths({ kind: "month", month: "2026-10" })).toEqual(["2026-10"]);
    expect(selectedMonths({ kind: "range", from: "2025-11", to: "2026-01" })).toEqual(["2026-01", "2025-12", "2025-11"]);
    expect(selectedMonths({ kind: "range", from: "2026-03", to: "2026-01" })).toEqual(["2026-03", "2026-02", "2026-01"]);
  });

  it("menjumlah per pegawai per bulan, baris ditolak tidak dihitung", () => {
    const list = [
      at(claim("budi", "paid", [item(100_000), item(50_000, true)]), "2026-09-03", "a"),
      at(claim("budi", "approved", [item(200_000)]), "2026-10-02", "b"),
      at(claim("budi", "rejected", [item(999_000)]), "2026-10-05", "c"),
      at(claim("maya", "pending_finance", [item(400_000)]), "2026-10-07", "d"),
      at(claim("maya", "paid", [item(70_000)]), "2026-03-01", "e"),
    ];
    const rows = monthlyByEmployee(list, ["2026-09", "2026-10"]);
    expect(rows.map((r) => r.userId)).toEqual(["maya", "budi"]);
    const budi = rows[1];
    expect(budi.months.get("2026-09")).toMatchObject({ count: 1, paid: 100_000, declined: 50_000 });
    expect(budi.months.get("2026-10")).toMatchObject({ count: 2, unpaid: 200_000, declined: 999_000 });
    expect(reimbursed(budi.total)).toBe(300_000);
    expect(reimbursed(rows[0].total)).toBe(400_000); // bulan Maret di luar kolom
  });
});
