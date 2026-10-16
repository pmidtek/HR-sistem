import { describe, expect, it } from "vitest";
import type { Reimbursement, ReimbursementItem, User } from "../types";
import { validateReimburseRow } from "./reimburse";
import { holderMatches, maskAccount, riskFlags, type RiskContext } from "./reimburse-risk";

const item = (id: string, over: Partial<ReimbursementItem> = {}): ReimbursementItem => ({
  id, date: "2026-10-07", description: "Grab", categoryId: "transportation", projectCode: null, amountUsdCents: null, amount: 98_000, files: [{ name: "a.jpg", url: null }], declined: null, ...over,
});
const claim = (id: string, userId: string, items: ReimbursementItem[], status: Reimbursement["status"] = "pending_finance"): Reimbursement => ({
  id, number: id.toUpperCase(), userId, title: "-", submittedAt: "2026-10-07", items, status, paidAt: null, payment: null, logs: [],
});
const owner: User = {
  id: "u1", employeeCode: "E1", name: "Andi Pratama", email: "a@x", role: "employee", teamId: "t", position: "", joinDate: "2020-01-01", active: true,
  bankAccount: { bankName: "BCA", accountNumber: "1234567890", accountHolder: "ANDI PRATAMA", verified: true, verifiedBy: "fin", updatedAt: "2026-01-01" },
};
const ctx = (all: Reimbursement[], o: User = owner): RiskContext => ({
  all, owner: o, categories: [{ id: "transportation", name: "Transportation", limitPerItem: 500_000 }], holidays: new Set(), today: "2026-10-16",
});
const codes = (r: Reimbursement, c: RiskContext) => riskFlags(r, c).map((f) => f.code);

describe("anti-fraud: tanda risiko", () => {
  it("pengajuan bersih tidak ada tanda", () => {
    const r = claim("a", "u1", [item("1")]);
    expect(codes(r, ctx([r]))).toEqual([]);
  });

  it("struk ganda di pengajuan lain (siapa pun) & file yang sama", () => {
    const a = claim("a", "u1", [item("1", { files: [{ name: "x.jpg", url: null, hash: "h1" }] })]);
    const b = claim("b", "u2", [item("2", { files: [{ name: "y.jpg", url: null, hash: "h1" }] })]);
    expect(codes(b, ctx([a, b]))).toEqual(expect.arrayContaining(["duplicate_receipt", "duplicate_file"]));
  });

  it("pengajuan yang ditolak tidak dihitung sebagai duplikat", () => {
    const a = claim("a", "u1", [item("1")], "rejected");
    const b = claim("b", "u1", [item("2")]);
    expect(codes(b, ctx([a, b]))).toEqual([]);
  });

  it("melebihi limit kategori & transaksi akhir pekan", () => {
    const r = claim("a", "u1", [item("1", { amount: 750_000, date: "2026-10-11" })]);
    expect(codes(r, ctx([r]))).toEqual(["over_limit", "weekend"]);
  });

  it("rekening: belum diverifikasi, nama beda, baru diganti", () => {
    const o: User = { ...owner, bankAccount: { bankName: "BCA", accountNumber: "999", accountHolder: "Budi Santoso", verified: false, verifiedBy: null, updatedAt: "2026-10-14T10:00:00+07:00" } };
    const r = claim("a", "u1", [item("1")]);
    expect(codes(r, ctx([r], o))).toEqual(["account_unverified", "holder_mismatch", "account_recently_changed"]);
  });

  it("nama pemilik rekening & masking", () => {
    expect(holderMatches("ANDI PRATAMA", "Andi Pratama")).toBe(true);
    expect(holderMatches("Andi Pratama Putra", "Andi Pratama")).toBe(true);
    expect(holderMatches("Budi Santoso", "Andi Pratama")).toBe(false);
    expect(maskAccount("1234 5678 90")).toBe("•••• 7890");
  });

  it("struk lebih tua dari batas tidak bisa diajukan", () => {
    const row = { date: "2026-07-01", description: "x", categoryId: "c", projectCode: null, amountUsdCents: null, amount: 1, files: [{ name: "a", url: null }] };
    expect(validateReimburseRow(row, "2026-10-16", 60).date).toContain("older than 60 days");
    expect(validateReimburseRow({ ...row, date: "2026-09-01" }, "2026-10-16", 60)).toEqual({});
  });
});
