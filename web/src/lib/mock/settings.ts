import type { AppSettings, TerRate } from "../settings-types";

/** [batas bawah, batas atas (null = tak terbatas), tarif bps]. Seed contoh — WAJIB diverifikasi Finance/konsultan pajak. */
type TerRow = [number, number | null, number];

const terA: TerRow[] = [
  [0, 5_400_000, 0], [5_400_001, 5_650_000, 25], [5_650_001, 5_950_000, 50], [5_950_001, 6_300_000, 75],
  [6_300_001, 6_750_000, 100], [6_750_001, 7_500_000, 125], [7_500_001, 8_550_000, 150], [8_550_001, 9_650_000, 175],
  [9_650_001, 10_050_000, 200], [10_050_001, 10_350_000, 225], [10_350_001, 10_700_000, 250], [10_700_001, 11_050_000, 300],
  [11_050_001, 11_600_000, 350], [11_600_001, 12_500_000, 400], [12_500_001, 13_750_000, 500], [13_750_001, 15_100_000, 600],
  [15_100_001, 16_950_000, 700], [16_950_001, 19_750_000, 800], [19_750_001, 24_150_000, 900], [24_150_001, null, 1000],
];
const terB: TerRow[] = [
  [0, 6_200_000, 0], [6_200_001, 6_500_000, 25], [6_500_001, 6_850_000, 50], [6_850_001, 7_300_000, 75],
  [7_300_001, 9_200_000, 100], [9_200_001, 10_750_000, 150], [10_750_001, 11_250_000, 200], [11_250_001, 11_600_000, 250],
  [11_600_001, 12_600_000, 300], [12_600_001, 13_600_000, 400], [13_600_001, 14_950_000, 500], [14_950_001, null, 600],
];
const terC: TerRow[] = [
  [0, 6_600_000, 0], [6_600_001, 6_950_000, 25], [6_950_001, 7_350_000, 50], [7_350_001, 7_800_000, 75],
  [7_800_001, 8_850_000, 100], [8_850_001, 9_800_000, 125], [9_800_001, 10_950_000, 150], [10_950_001, 11_200_000, 175],
  [11_200_001, 12_050_000, 200], [12_050_001, 12_950_000, 300], [12_950_001, 14_150_000, 400], [14_150_001, null, 500],
];

function toRates(category: TerRate["category"], rows: TerRow[]): TerRate[] {
  return rows.map(([minIncome, maxIncome, rateBps], i) => ({ id: `${category}-${i}`, category, minIncome, maxIncome, rateBps }));
}

export const defaultSettings: AppSettings = {
  work: { normalHoursPerDay: 8, workdaysPerWeek: 5, timesheetBackdateDays: 7, monthlyTargetHours: 168 },
  overtime: {
    mode: "depnaker",
    hourlyDivisor: 173,
    weekdayFirstHour: 1.5,
    weekdayNextHours: 2,
    holidayFirst8: 2,
    holidayHour9: 3,
    holidayHour10to12: 4,
    flatRatePerHour: 50_000,
  },
  payroll: { periodMode: "cutoff", cutoffDay: 25, reimburseViaPayroll: true, payslipPasswordProtected: false },
  bpjs: [
    { id: "kes", name: "BPJS Kesehatan", employeeBps: 100, employerBps: 400, wageCap: 12_000_000 },
    { id: "jht", name: "BPJS JHT", employeeBps: 200, employerBps: 370, wageCap: null },
    { id: "jp", name: "BPJS JP", employeeBps: 100, employerBps: 200, wageCap: 10_547_400 },
    { id: "jkk", name: "BPJS JKK", employeeBps: 0, employerBps: 24, wageCap: null },
    { id: "jkm", name: "BPJS JKM", employeeBps: 0, employerBps: 30, wageCap: null },
  ],
  ter: [...toRates("A", terA), ...toRates("B", terB), ...toRates("C", terC)],
  company: { name: "PT Nama Perusahaan", address: "Jl. Jenderal Sudirman No. 1, Jakarta Selatan", logoUrl: "" },
};
