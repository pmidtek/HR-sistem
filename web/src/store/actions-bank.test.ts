import { describe, expect, it } from "vitest";
import { payReimburseClaims, reimburseActionsFor, submitReimburseClaim, actOnReimburse } from "./actions-reimburse";
import { saveBankAccount, verifyBankAccount } from "./actions-bank";
import { initialState } from "./state";

const TODAY = "2026-10-16";
const fin = { id: "u3", role: "finance" as const };
const sh = { id: "u1", role: "stakeholder" as const };
const andi = { id: "u5", role: "employee" as const }; // PIC Rafi
const rafi = { id: "u11", role: "external" as const };
const row = { date: "2026-10-15", description: "Taxi", categoryId: "transportation", projectCode: null, amountUsdCents: null, amount: 120_000, files: [{ name: "t.jpg", url: null }] };
const proof = [{ name: "trf.jpg", url: null }];

describe("rekening bank", () => {
  it("mengubah rekening membuatnya belum terverifikasi; hanya Finance (bukan pemilik) yang verifikasi", () => {
    const s1 = saveBankAccount(initialState, "u4", { bankName: "BCA", accountNumber: "1111 2222 33", accountHolder: "Budi Santoso" }, { id: "u4", role: "employee" });
    const acct = s1.users.find((u) => u.id === "u4")?.bankAccount;
    expect(acct).toMatchObject({ accountNumber: "1111222233", verified: false });
    expect(() => verifyBankAccount(s1, "u4", { id: "u4", role: "employee" })).toThrow();
    expect(() => verifyBankAccount(s1, "u3", fin)).toThrow();
    expect(verifyBankAccount(s1, "u4", fin).users.find((u) => u.id === "u4")?.bankAccount?.verified).toBe(true);
  });

  it("pegawai tidak bisa mengubah rekening orang lain; nomor harus angka", () => {
    expect(() => saveBankAccount(initialState, "u4", { bankName: "BCA", accountNumber: "123456", accountHolder: "X" }, andi)).toThrow();
    expect(() => saveBankAccount(initialState, "u4", { bankName: "BCA", accountNumber: "12ab", accountHolder: "X" }, { id: "u4", role: "employee" })).toThrow();
  });

  it("transfer ke rekening belum terverifikasi diblokir; rekening tujuan dicatat saat bayar", () => {
    // Maya (u6) punya rekening belum terverifikasi; rb7-nya sudah dibayar, jadi buat pengajuan baru yang disetujui.
    let s = submitReimburseClaim(initialState, "u6", "Test", [row], TODAY);
    const id = s.reimbursements[0].id;
    s = actOnReimburse(actOnReimburse(s, id, "forward", fin), id, "approve", sh);
    expect(() => payReimburseClaims(s, [id], { date: TODAY, method: "transfer", reference: "", proofFiles: proof }, fin)).toThrow(/not verified/);
    s = verifyBankAccount(s, "u6", fin);
    const paid = payReimburseClaims(s, [id], { date: TODAY, method: "transfer", reference: "", proofFiles: proof }, fin).reimbursements.find((r) => r.id === id);
    expect(paid?.payment?.toAccount).toMatchObject({ bankName: "Jago", accountHolder: "MAYA PUTRI" });
  });
});

describe("pengajuan external (freelance)", () => {
  it("menunggu PIC dulu, lalu Finance; hanya PIC yang bisa konfirmasi", () => {
    let s = submitReimburseClaim(initialState, rafi.id, "Shoot", [row], TODAY);
    const claim = s.reimbursements[0];
    expect(claim.status).toBe("pending_sponsor");
    expect(s.notifications.find((n) => n.userId === andi.id)?.title).toBe("Please confirm a reimbursement");
    expect(reimburseActionsFor(s, fin, claim)).toEqual([]);
    expect(reimburseActionsFor(s, andi, claim)).toEqual(["confirm", "revision", "reject"]);
    s = actOnReimburse(s, claim.id, "confirm", andi);
    expect(s.reimbursements.find((r) => r.id === claim.id)?.status).toBe("pending_finance");
    expect(s.notifications.find((n) => n.userId === rafi.id)?.title).toBe("Your PIC confirmed your reimbursement");
  });

  it("external yang aksesnya habis tidak bisa mengajukan", () => {
    const expired = { ...initialState, users: initialState.users.map((u) => (u.id === "u11" && u.external ? { ...u, external: { ...u.external, accessUntil: "2026-10-01" } } : u)) };
    expect(() => submitReimburseClaim(expired, rafi.id, "x", [row], TODAY)).toThrow(/access period/);
  });

  it("struk lebih tua dari 6 bulan ditolak saat submit", () => {
    expect(() => submitReimburseClaim(initialState, "u4", "old", [{ ...row, date: "2026-03-01" }], TODAY)).toThrow();
  });
});
