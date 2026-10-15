import { describe, expect, it } from "vitest";
import { claimTotal } from "@/lib/calc/reimburse";
import { actOnReimburse, payReimburseClaims, reviseReimburseClaim, setReimburseItemDecline, submitReimburseClaim } from "./actions-reimburse";
import { initialState } from "./state";

const TODAY = "2026-10-07";
const emp = { id: "u4", role: "employee" as const };
const fin = { id: "u3", role: "finance" as const };
const sh = { id: "u1", role: "stakeholder" as const };
const rows = [
  { date: "2026-10-01", description: "Tiket Whoosh", categoryId: "transportation", projectCode: null, amountUsdCents: null, amount: 300_000, files: ["a.pdf"] },
  { date: "2026-10-01", description: "Claude", categoryId: "subscriptions", projectCode: "OTHERS", amountUsdCents: 2_200, amount: 401_944, files: ["b.pdf", "c.jpg"] },
];

describe("alur reimburse per grup", () => {
  const s1 = submitReimburseClaim(initialState, emp.id, "Perjalanan", rows, TODAY);
  const claim = s1.reimbursements[0];

  it("pengajuan baru jadi satu grup dengan nomor urut", () => {
    expect(claim).toMatchObject({ userId: "u4", status: "pending_finance", number: "RB-2610-003" });
    expect(claim.items).toHaveLength(2);
  });

  it("Finance tolak 1 baris, teruskan; Stakeholder setujui; Finance bayar sekaligus", () => {
    const s2 = setReimburseItemDecline(s1, claim.id, claim.items[1].id, "Akun pribadi", fin);
    const s3 = actOnReimburse(s2, claim.id, "forward", fin);
    expect(() => setReimburseItemDecline(s3, claim.id, claim.items[0].id, "x", fin)).toThrow();
    const s4 = actOnReimburse(s3, claim.id, "approve", sh);
    const approved = s4.reimbursements.find((r) => r.id === claim.id)!;
    expect(approved.status).toBe("approved");
    expect(claimTotal(approved)).toBe(300_000);
    const s5 = payReimburseClaims(s4, [claim.id, "rb6"], { date: TODAY, method: "transfer", reference: "TRF-1" }, fin);
    const paid = s5.reimbursements.find((r) => r.id === claim.id)!;
    expect(paid).toMatchObject({ status: "paid", paidAt: TODAY, payment: { method: "transfer", reference: "TRF-1", byUserId: "u3" } });
    expect(s5.reimbursements.find((r) => r.id === "rb6")!.status).toBe("paid");
  });

  it("tidak bisa diteruskan jika semua baris ditolak", () => {
    let s = s1;
    for (const i of claim.items) s = setReimburseItemDecline(s, claim.id, i.id, "Tidak sesuai", fin);
    expect(() => actOnReimburse(s, claim.id, "forward", fin)).toThrow();
  });

  it("tolak & minta revisi wajib alasan; pemilik bisa perbaiki lalu kirim ulang", () => {
    expect(() => actOnReimburse(s1, claim.id, "reject", fin, " ")).toThrow();
    const s2 = actOnReimburse(s1, claim.id, "revision", fin, "Struk buram");
    const s3 = reviseReimburseClaim(s2, claim.id, emp, "Perjalanan (revisi)", rows.slice(0, 1), TODAY);
    const r = s3.reimbursements.find((x) => x.id === claim.id)!;
    expect(r).toMatchObject({ status: "pending_finance", title: "Perjalanan (revisi)" });
    expect(r.items).toHaveLength(1);
  });

  it("pegawai biasa tidak bisa menandai dibayar", () => {
    expect(() => payReimburseClaims(s1, ["rb6"], { date: TODAY, method: "transfer", reference: "" }, emp)).toThrow();
  });
});
