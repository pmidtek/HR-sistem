import { describe, expect, it } from "vitest";
import { allowedLeaveActions, allowedReimburseActions } from "./approval";

const hr = { id: "hr1", role: "hr" as const };
const sh = { id: "sh1", role: "stakeholder" as const };
const fin = { id: "fin1", role: "finance" as const };
const emp = { id: "e1", role: "employee" as const };

describe("approval cuti/lembur", () => {
  it("HR bisa teruskan/tolak saat menunggu HR", () => {
    expect(allowedLeaveActions(hr, "e1", "pending_hr")).toEqual(["forward", "reject"]);
  });

  it("Stakeholder tidak bisa memutuskan sebelum HR meneruskan", () => {
    expect(allowedLeaveActions(sh, "e1", "pending_hr")).toEqual([]);
  });

  it("Stakeholder setuju/tolak setelah diteruskan", () => {
    expect(allowedLeaveActions(sh, "e1", "pending_stakeholder")).toEqual(["approve", "reject"]);
  });

  it("tidak boleh meng-approve pengajuan sendiri", () => {
    expect(allowedLeaveActions(hr, "hr1", "pending_hr")).toEqual(["cancel"]);
    expect(allowedLeaveActions(sh, "sh1", "pending_stakeholder")).toEqual(["cancel"]);
  });

  it("cuti disetujui bisa dibatalkan sebelum tanggal mulai saja", () => {
    expect(allowedLeaveActions(emp, "e1", "approved", { startDate: "2026-10-10", today: "2026-10-05" })).toEqual([
      "cancel",
    ]);
    expect(allowedLeaveActions(emp, "e1", "approved", { startDate: "2026-10-05", today: "2026-10-05" })).toEqual([]);
  });
});

describe("approval reimburse", () => {
  it("Finance review tahap 1", () => {
    expect(allowedReimburseActions(fin, "e1", "pending_finance")).toEqual(["forward", "revision", "reject"]);
  });

  it("Pegawai submit ulang setelah revisi", () => {
    expect(allowedReimburseActions(emp, "e1", "revision")).toEqual(["resubmit"]);
  });

  it("Finance tidak bisa review reimburse sendiri", () => {
    expect(allowedReimburseActions(fin, "fin1", "pending_finance")).toEqual([]);
  });

  it("Finance tandai dibayar setelah disetujui", () => {
    expect(allowedReimburseActions(fin, "e1", "approved")).toEqual(["mark_paid"]);
  });
});
