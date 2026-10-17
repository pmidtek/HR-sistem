import { describe, expect, it } from "vitest";
import { defaultSettings } from "../mock/settings";
import { ROLE_ID } from "./ids";
import { toClaims, toSettings, toUsers, type ClaimRow, type UserRow } from "./mappers";

const user = (over: Partial<UserRow>): UserRow => ({
  id: "u1", first_name: "Budi", last_name: "Santoso", email: "budi@x.id", role: ROLE_ID.employee, status: "active",
  employee_code: "EMP-0001", team: "t1", position: "Engineer", join_date: "2022-02-01", external_company: null, sponsor: null, access_until: null, ...over,
});

describe("toUsers", () => {
  it("memetakan role, rekening tersamar, dan info external", () => {
    const list = toUsers(
      [user({}), user({ id: "u2", first_name: "Rafi", last_name: null, role: ROLE_ID.external, sponsor: "u1", access_until: "2026-12-31T00:00:00", external_company: "Studio" })],
      [{ owner: "u2", bank_name: "BCA", account_number: null, account_last4: "1234", account_holder: "RAFI", verified: false, verified_by: null, date_updated: null, date_created: "2026-10-01T00:00:00Z" }],
    );
    expect(list[0]).toMatchObject({ name: "Budi Santoso", role: "employee", bankAccount: null, external: null });
    expect(list[1]).toMatchObject({ name: "Rafi", role: "external", external: { sponsorId: "u1", accessUntil: "2026-12-31", company: "Studio" } });
    expect(list[1].bankAccount?.accountNumber).toBe("••••1234");
  });
  it("akun tanpa role SIDESAH (admin teknis) disembunyikan", () => {
    expect(toUsers([user({ role: "admin-role" })], [])).toHaveLength(0);
  });
});

describe("toClaims", () => {
  const row: ClaimRow = {
    id: "c1", number: "RB-2610-001", claimant: "u1", title: "Trip", submitted_at: "2026-10-06", status: "paid", paid_at: "2026-10-09",
    paid_to_bank_name: "BCA", paid_to_account_number: undefined, paid_to_account_last4: "8901", paid_to_account_holder: "BUDI",
    items: [{
      id: "i1", date: "2026-10-05", description: "Taxi", category: "cat", project_code: null, amount_usd_cents: null, amount: 120000,
      declined_note: "No receipt", declined_by: "u3", files: [{ directus_files_id: { id: "f1", filename_download: "taxi.png", sha256: "abc" } }, { directus_files_id: null }],
    }],
    payment: { date: "2026-10-09", method: "transfer", reference: "TRF", paid_by: "u3", proof_files: [{ directus_files_id: { id: "f2", filename_download: "proof.png" } }] },
  };
  it("memetakan baris, file, pembayaran, dan riwayat", () => {
    const [c] = toClaims([row], [{ subject_id: "c1", from_status: null, to_status: "pending_finance", note: null, actor: "u1", date_created: "2026-10-06T10:00:00Z" }]);
    expect(c.items[0].files[0]).toEqual({ id: "f1", name: "taxi.png", url: "/panel/assets/f1", hash: "abc" });
    expect(c.items[0].files[1].url).toBeNull();
    expect(c.items[0].declined).toEqual({ note: "No receipt", byUserId: "u3" });
    expect(c.payment?.toAccount?.accountNumber).toBe("••••8901");
    expect(c.payment?.proofFiles[0].url).toBe("/panel/assets/f2");
    expect(c.logs).toHaveLength(1);
  });
});

describe("toSettings", () => {
  it("memakai nilai server dan default untuk yang kosong", () => {
    const s = toSettings({ reimburse_usd_rate: 17000, reimburse_pay_days: [2, 4], company_name: "PT IDTEK" }, defaultSettings);
    expect(s.reimburse.usdRate).toBe(17000);
    expect(s.reimburse.payDays).toEqual([2, 4]);
    expect(s.reimburse.leadDays).toBe(defaultSettings.reimburse.leadDays);
    expect(s.company.name).toBe("PT IDTEK");
    expect(s.bpjs).toEqual(defaultSettings.bpjs);
  });
});
