import { describe, expect, it } from "vitest";
import type { OvertimeSettings } from "../settings-types";
import { formatDate, formatRupiah, terbilang } from "../format";
import { countWorkingDays, hasSufficientBalance } from "./leave";
import { dailyOvertime, overtimeBreakdown, overtimePay, overtimePerEntry } from "./overtime";
import { overlaps, validateEntry, type ValidationContext } from "./timesheet";
import { endOfMonth, startOfWeek, todayJakarta } from "./dates";

const depnaker: OvertimeSettings = {
  mode: "depnaker",
  hourlyDivisor: 173,
  weekdayFirstHour: 1.5,
  weekdayNextHours: 2,
  holidayFirst8: 2,
  holidayHour9: 3,
  holidayHour10to12: 4,
  flatRatePerHour: 50_000,
};

describe("lembur harian", () => {
  it("hari kerja 10 jam, normal 8 jam → lembur 2 jam", () => {
    const r = dailyOvertime([{ start: "08:00", end: "12:00" }, { start: "13:00", end: "19:00" }], 8, false);
    expect(r).toEqual({ workedMinutes: 600, normalMinutes: 480, overtimeMinutes: 120 });
  });

  it("hari kerja kurang dari 8 jam → tidak ada lembur", () => {
    expect(dailyOvertime([{ start: "09:00", end: "15:00" }], 8, false).overtimeMinutes).toBe(0);
  });

  it("jam normal 7 jam bisa diatur", () => {
    expect(dailyOvertime([{ start: "09:00", end: "17:00" }], 7, false).overtimeMinutes).toBe(60);
  });

  it("lembur ditandai pada entri setelah melewati jam normal", () => {
    const entries = [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "18:00" }];
    expect(overtimePerEntry(entries, 8, false)).toEqual([0, 60]);
    expect(overtimePerEntry(entries, 8, true)).toEqual([240, 300]);
  });

  it("hari libur → seluruh jam dihitung lembur", () => {
    expect(dailyOvertime([{ start: "09:00", end: "12:00" }], 8, true).overtimeMinutes).toBe(180);
  });
});

describe("upah lembur Depnaker", () => {
  // Gaji pokok + tunjangan tetap = 11.100.000 → upah/jam = 11.100.000 / 173 = 64.161,85
  const base = 11_100_000;

  it("hari kerja 3 jam: 1×1,5 + 2×2 = 5,5 × upah/jam", () => {
    expect(overtimeBreakdown(180, false, depnaker).map((b) => b.multiplier)).toEqual([1.5, 2]);
    expect(overtimePay(180, false, base, depnaker)).toBe(Math.round((base / 173) * 5.5));
  });

  it("hari kerja 30 menit: 0,5 × 1,5", () => {
    expect(overtimePay(30, false, base, depnaker)).toBe(Math.round((base / 173) * 0.75));
  });

  it("hari libur 10 jam: 8×2 + 1×3 + 1×4 = 23", () => {
    expect(overtimePay(600, true, base, depnaker)).toBe(Math.round((base / 173) * 23));
  });

  it("mode flat: jam × tarif", () => {
    expect(overtimePay(150, false, base, { ...depnaker, mode: "flat" })).toBe(125_000);
  });

  it("0 menit → 0", () => {
    expect(overtimePay(0, true, base, depnaker)).toBe(0);
  });
});

describe("hari kerja cuti", () => {
  const holidays = new Set(["2026-12-25"]);

  it("Senin–Jumat = 5 hari", () => {
    expect(countWorkingDays("2026-10-05", "2026-10-09", holidays)).toBe(5);
  });

  it("melewati akhir pekan tidak dihitung", () => {
    expect(countWorkingDays("2026-10-09", "2026-10-12", holidays)).toBe(2);
  });

  it("libur nasional tidak dihitung", () => {
    expect(countWorkingDays("2026-12-24", "2026-12-28", holidays)).toBe(2);
  });

  it("rentang terbalik = 0", () => {
    expect(countWorkingDays("2026-10-09", "2026-10-05", holidays)).toBe(0);
  });

  it("saldo tidak boleh minus", () => {
    expect(hasSufficientBalance(12, 10, 2)).toBe(true);
    expect(hasSufficientBalance(12, 10, 3)).toBe(false);
  });
});

describe("validasi timesheet", () => {
  const ctx: ValidationContext = {
    today: "2026-10-05",
    backdateDays: 7,
    approvedLeaveDates: new Set(["2026-10-02"]),
    existing: [{ id: "a", date: "2026-10-05", start: "09:00", end: "11:00" }],
  };
  const base = { date: "2026-10-05", projectCode: "INTERNAL", activityId: "dev", description: "Kerja" };

  it("entri valid", () => {
    expect(validateEntry({ ...base, start: "11:00", end: "12:30" }, ctx)).toEqual([]);
  });

  it("bukan kelipatan 15 menit", () => {
    expect(validateEntry({ ...base, start: "11:10", end: "12:00" }, ctx)).toContain("Jam harus kelipatan 15 menit.");
  });

  it("jam selesai sebelum mulai", () => {
    expect(validateEntry({ ...base, start: "13:00", end: "12:00" }, ctx)).toContain(
      "Jam selesai harus setelah jam mulai.",
    );
  });

  it("tumpang tindih", () => {
    expect(overlaps({ date: "2026-10-05", start: "10:30", end: "12:00" }, ctx.existing)).toBe(true);
    expect(overlaps({ date: "2026-10-05", start: "11:00", end: "12:00" }, ctx.existing)).toBe(false);
  });

  it("edit entri sendiri tidak dianggap tumpang tindih", () => {
    expect(overlaps({ id: "a", date: "2026-10-05", start: "09:00", end: "10:00" }, ctx.existing)).toBe(false);
  });

  it("lewat batas mundur 7 hari", () => {
    expect(validateEntry({ ...base, date: "2026-09-27", start: "09:00", end: "10:00" }, ctx)).toContain(
      "Timesheet hanya bisa diisi maksimal 7 hari ke belakang.",
    );
  });

  it("tanggal cuti disetujui", () => {
    expect(validateEntry({ ...base, date: "2026-10-02", start: "09:00", end: "10:00" }, ctx)).toContain(
      "Tanggal ini adalah hari cuti yang sudah disetujui.",
    );
  });
});

describe("format", () => {
  it("rupiah", () => {
    expect(formatRupiah(1_250_000)).toBe("Rp1.250.000");
    expect(formatRupiah(0)).toBe("Rp0");
  });

  it("tanggal DD MMM YYYY", () => {
    expect(formatDate("2026-10-05")).toBe("05 Okt 2026");
  });

  it("terbilang", () => {
    expect(terbilang(11_981_792)).toBe(
      "sebelas juta sembilan ratus delapan puluh satu ribu tujuh ratus sembilan puluh dua",
    );
    expect(terbilang(1_000)).toBe("seribu");
    expect(terbilang(115)).toBe("seratus lima belas");
  });

  it("awal minggu = Senin, today di Asia/Jakarta", () => {
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05");
    expect(todayJakarta(new Date("2026-10-04T18:00:00Z"))).toBe("2026-10-05");
    expect(endOfMonth("2026-12")).toBe("2026-12-31");
    expect(endOfMonth("2028-02")).toBe("2028-02-29");
  });
});
