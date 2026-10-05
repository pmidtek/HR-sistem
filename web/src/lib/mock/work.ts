import { addDays, eachDay, isWeekend } from "../calc/dates";
import type {
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  OvertimeRequest,
  Reimbursement,
  ReimbursementCategory,
  TimesheetEntry,
} from "../types";
import { users } from "./people";

export const MOCK_TODAY = "2026-10-07";

export const leaveTypes: LeaveType[] = [
  { id: "annual", name: "Cuti Tahunan", quotaDays: 12, deductsBalance: true, unpaid: false, attachmentAfterDays: null },
  { id: "sick", name: "Sakit", quotaDays: null, deductsBalance: false, unpaid: false, attachmentAfterDays: 1 },
  { id: "special", name: "Izin Khusus", quotaDays: null, deductsBalance: false, unpaid: false, attachmentAfterDays: null },
  { id: "unpaid", name: "Cuti Tanpa Gaji", quotaDays: null, deductsBalance: false, unpaid: true, attachmentAfterDays: null },
];

const usedAnnual: Record<string, number> = { u1: 4, u10: 6, u2: 5, u3: 3, u4: 7, u8: 0, u5: 2, u9: 0, u6: 9, u7: 1 };

export const leaveBalances: LeaveBalance[] = users.map((u) => ({
  userId: u.id,
  leaveTypeId: "annual",
  year: 2026,
  quota: 12,
  used: usedAnnual[u.id] ?? 0,
}));

export const reimbursementCategories: ReimbursementCategory[] = [
  { id: "transport", name: "Transport" },
  { id: "meal", name: "Makan/Meeting" },
  { id: "hotel", name: "Hotel" },
  { id: "ops", name: "Operasional" },
];

/** Pola harian per user: [projectCode, activityId, start, end, description][] */
type Block = [string, string, string, string, string];

const patterns: Record<string, Block[]> = {
  u4: [
    ["PR260003", "meeting", "09:00", "09:30", "Daily standup tim engineering"],
    ["PR260003", "development", "09:30", "12:00", "Implementasi endpoint integrasi pembayaran"],
    ["PR260003", "development", "13:00", "18:00", "Perbaikan bug dan unit test modul invoice"],
  ],
  u8: [
    ["PR260003", "meeting", "09:00", "09:30", "Daily standup"],
    ["PR260005", "development", "09:30", "12:00", "Halaman dashboard klien"],
    ["PR260005", "development", "13:00", "18:00", "Integrasi API dan state management"],
  ],
  u5: [
    ["OP260012", "sales", "09:00", "11:00", "Presentasi solusi ke PT Maju Bersama"],
    ["OP260015", "admin", "11:00", "12:00", "Menyusun proposal teknis"],
    ["INTERNAL", "meeting", "13:00", "14:00", "Weekly sales review"],
    ["OP260018", "sales", "14:00", "18:00", "Follow up prospek dan call"],
  ],
  u6: [
    ["PR260005", "meeting", "09:00", "10:30", "Sprint planning"],
    ["PR260005", "design", "10:30", "12:00", "Review wireframe dengan klien"],
    ["PR260003", "research", "13:00", "18:00", "Menulis PRD fitur laporan"],
  ],
  u7: [
    ["PR260004", "analysis", "09:00", "12:00", "Cleaning data transaksi Q3"],
    ["PR260004", "analysis", "13:00", "18:00", "Membangun dashboard retensi"],
  ],
};

const defaultPattern: Block[] = [
  ["INTERNAL", "admin", "09:00", "12:00", "Pekerjaan administrasi rutin"],
  ["INTERNAL", "meeting", "13:00", "14:00", "Koordinasi internal"],
  ["INTERNAL", "admin", "14:00", "18:00", "Rekap dan dokumentasi"],
];

/** Hari dengan jam tambahan (lembur) per user. */
const extra: Record<string, { date: string; block: Block }[]> = {
  u4: [
    { date: "2026-09-29", block: ["PR260003", "development", "18:00", "20:30", "Hotfix produksi gateway pembayaran"] },
    { date: "2026-10-01", block: ["PR260003", "development", "18:00", "20:00", "Persiapan rilis v2.3"] },
    { date: "2026-10-03", block: ["PR260003", "development", "09:00", "13:00", "Deploy rilis v2.3 (Sabtu)"] },
  ],
  u7: [{ date: "2026-09-30", block: ["PR260004", "analysis", "18:00", "20:00", "Deadline laporan kuartal"] }],
  u8: [{ date: "2026-10-02", block: ["PR260005", "development", "18:00", "20:00", "Demo klien besok pagi"] }],
};

/** Tanggal cuti yang disetujui (tidak boleh ada timesheet). */
const onLeave: Record<string, string[]> = { u6: ["2026-09-28"], u7: ["2026-10-05", "2026-10-06"] };

function buildTimesheet(): TimesheetEntry[] {
  const out: TimesheetEntry[] = [];
  const days = eachDay(addDays(MOCK_TODAY, -15), addDays(MOCK_TODAY, -1)).filter((d) => !isWeekend(d));
  let n = 0;
  for (const u of users) {
    const pattern = patterns[u.id] ?? defaultPattern;
    for (const date of days) {
      if (onLeave[u.id]?.includes(date)) continue;
      for (const [projectCode, activityId, start, end, description] of pattern) {
        out.push({ id: `ts${++n}`, userId: u.id, date, projectCode, activityId, start, end, description, locked: false });
      }
    }
    for (const x of extra[u.id] ?? []) {
      const [projectCode, activityId, start, end, description] = x.block;
      out.push({ id: `ts${++n}`, userId: u.id, date: x.date, projectCode, activityId, start, end, description, locked: false });
    }
  }
  return out;
}

export const timesheetEntries: TimesheetEntry[] = buildTimesheet();

const log = (at: string, byUserId: string, from: string | null, to: string, note?: string) => ({ at, byUserId, from, to, note });

export const leaveRequests: LeaveRequest[] = [
  { id: "lv1", userId: "u4", leaveTypeId: "annual", startDate: "2026-10-19", endDate: "2026-10-21", workingDays: 3, reason: "Acara keluarga di Yogyakarta", status: "pending_hr", logs: [log("2026-10-03T10:12:00+07:00", "u4", null, "pending_hr")] },
  { id: "lv2", userId: "u9", leaveTypeId: "annual", startDate: "2026-10-12", endDate: "2026-10-13", workingDays: 2, reason: "Urusan pribadi", status: "pending_stakeholder", logs: [log("2026-10-01T09:00:00+07:00", "u9", null, "pending_hr"), log("2026-10-02T14:30:00+07:00", "u2", "pending_hr", "pending_stakeholder", "Tidak bentrok dengan jadwal tim.")] },
  { id: "lv3", userId: "u6", leaveTypeId: "sick", startDate: "2026-09-28", endDate: "2026-09-28", workingDays: 1, reason: "Demam", status: "approved", logs: [log("2026-09-28T07:30:00+07:00", "u6", null, "pending_hr"), log("2026-09-28T09:00:00+07:00", "u2", "pending_hr", "pending_stakeholder"), log("2026-09-28T11:00:00+07:00", "u1", "pending_stakeholder", "approved")] },
  { id: "lv4", userId: "u7", leaveTypeId: "annual", startDate: "2026-10-05", endDate: "2026-10-06", workingDays: 2, reason: "Menghadiri pernikahan saudara", status: "approved", logs: [log("2026-09-20T09:00:00+07:00", "u7", null, "pending_hr"), log("2026-09-21T10:00:00+07:00", "u2", "pending_hr", "pending_stakeholder"), log("2026-09-22T08:00:00+07:00", "u10", "pending_stakeholder", "approved")] },
  { id: "lv5", userId: "u5", leaveTypeId: "annual", startDate: "2026-09-10", endDate: "2026-09-11", workingDays: 2, reason: "Liburan", status: "rejected", logs: [log("2026-09-01T09:00:00+07:00", "u5", null, "pending_hr"), log("2026-09-02T10:00:00+07:00", "u2", "pending_hr", "rejected", "Bertepatan dengan deadline proposal besar.")] },
  { id: "lv6", userId: "u2", leaveTypeId: "annual", startDate: "2026-10-26", endDate: "2026-10-27", workingDays: 2, reason: "Keperluan keluarga", status: "pending_hr", logs: [log("2026-10-04T20:00:00+07:00", "u2", null, "pending_hr")] },
];

export const overtimeRequests: OvertimeRequest[] = [
  { id: "ot1", userId: "u4", date: "2026-09-29", isHoliday: false, requestedMinutes: 150, approvedMinutes: 150, reason: "Hotfix produksi", status: "approved", logs: [log("2026-09-30T09:00:00+07:00", "u4", null, "pending_hr"), log("2026-09-30T13:00:00+07:00", "u2", "pending_hr", "pending_stakeholder"), log("2026-10-01T08:00:00+07:00", "u1", "pending_stakeholder", "approved")] },
  { id: "ot2", userId: "u4", date: "2026-10-01", isHoliday: false, requestedMinutes: 120, approvedMinutes: null, reason: "Persiapan rilis", status: "pending_stakeholder", logs: [log("2026-10-02T09:00:00+07:00", "u4", null, "pending_hr"), log("2026-10-02T15:00:00+07:00", "u2", "pending_hr", "pending_stakeholder")] },
  { id: "ot3", userId: "u7", date: "2026-09-30", isHoliday: false, requestedMinutes: 120, approvedMinutes: null, reason: "Deadline laporan kuartal", status: "pending_hr", logs: [log("2026-10-01T09:00:00+07:00", "u7", null, "pending_hr")] },
];

export const reimbursements: Reimbursement[] = [
  { id: "rb1", userId: "u5", date: "2026-09-30", categoryId: "transport", projectCode: "OP260012", amount: 185_000, description: "Grab ke kantor PT Maju Bersama (PP)", files: ["struk-grab.jpg"], status: "pending_finance", paidAt: null, logs: [log("2026-09-30T18:00:00+07:00", "u5", null, "pending_finance")] },
  { id: "rb2", userId: "u5", date: "2026-09-25", categoryId: "meal", projectCode: "OP260015", amount: 640_000, description: "Makan siang meeting dengan klien (4 orang)", files: ["nota-resto.jpg"], status: "pending_stakeholder", paidAt: null, logs: [log("2026-09-25T20:00:00+07:00", "u5", null, "pending_finance"), log("2026-09-26T10:00:00+07:00", "u3", "pending_finance", "pending_stakeholder")] },
  { id: "rb3", userId: "u4", date: "2026-09-20", categoryId: "ops", projectCode: "PR260003", amount: 350_000, description: "Langganan tools monitoring 1 bulan", files: ["invoice.pdf"], status: "approved", paidAt: null, logs: [log("2026-09-20T12:00:00+07:00", "u4", null, "pending_finance"), log("2026-09-21T09:00:00+07:00", "u3", "pending_finance", "pending_stakeholder"), log("2026-09-22T09:00:00+07:00", "u1", "pending_stakeholder", "approved")] },
  { id: "rb4", userId: "u6", date: "2026-09-15", categoryId: "hotel", projectCode: "PR260005", amount: 1_250_000, description: "Hotel 1 malam workshop klien Bandung", files: ["hotel.pdf", "kwitansi.jpg"], status: "paid", paidAt: "2026-09-25", logs: [] },
  { id: "rb5", userId: "u7", date: "2026-09-28", categoryId: "transport", projectCode: "INTERNAL", amount: 75_000, description: "Parkir dan tol", files: ["struk.jpg"], status: "revision", paidAt: null, logs: [log("2026-09-28T18:00:00+07:00", "u7", null, "pending_finance"), log("2026-09-29T10:00:00+07:00", "u3", "pending_finance", "revision", "Foto struk tol buram, mohon upload ulang.")] },
];
