import type { OvertimeSettings } from "../settings-types";
import { toMinutes } from "./dates";

export type DayEntry = { start: string; end: string };

export type DailyOvertime = { workedMinutes: number; normalMinutes: number; overtimeMinutes: number };

/**
 * Hitung jam lembur satu hari.
 * - Hari kerja: menit di atas jam normal = lembur (urut berdasarkan jam mulai).
 * - Hari libur/akhir pekan: seluruh menit = lembur hari libur.
 */
export function dailyOvertime(entries: DayEntry[], normalHoursPerDay: number, isHoliday: boolean): DailyOvertime {
  const workedMinutes = entries.reduce((sum, e) => sum + (toMinutes(e.end) - toMinutes(e.start)), 0);
  if (isHoliday) return { workedMinutes, normalMinutes: 0, overtimeMinutes: workedMinutes };
  const normalCap = Math.round(normalHoursPerDay * 60);
  const normalMinutes = Math.min(workedMinutes, normalCap);
  return { workedMinutes, normalMinutes, overtimeMinutes: workedMinutes - normalMinutes };
}

export type OvertimeBreakdown = { fromHour: number; toHour: number; hours: number; multiplier: number };

/**
 * Pecah menit lembur jadi blok pengali (mode Depnaker, 5 hari kerja).
 * Hari kerja: jam ke-1 × weekdayFirstHour, jam berikutnya × weekdayNextHours.
 * Hari libur: jam 1–8 × holidayFirst8, jam 9 × holidayHour9, jam 10–12 × holidayHour10to12.
 */
export function overtimeBreakdown(minutes: number, isHoliday: boolean, s: OvertimeSettings): OvertimeBreakdown[] {
  const tiers: { upTo: number; multiplier: number }[] = isHoliday
    ? [
        { upTo: 8, multiplier: s.holidayFirst8 },
        { upTo: 9, multiplier: s.holidayHour9 },
        { upTo: Number.POSITIVE_INFINITY, multiplier: s.holidayHour10to12 },
      ]
    : [
        { upTo: 1, multiplier: s.weekdayFirstHour },
        { upTo: Number.POSITIVE_INFINITY, multiplier: s.weekdayNextHours },
      ];

  const totalHours = minutes / 60;
  const out: OvertimeBreakdown[] = [];
  let from = 0;
  for (const tier of tiers) {
    if (from >= totalHours) break;
    const to = Math.min(tier.upTo, totalHours);
    out.push({ fromHour: from, toHour: to, hours: to - from, multiplier: tier.multiplier });
    from = to;
  }
  return out;
}

/** Upah lembur dalam Rupiah (integer, dibulatkan). */
export function overtimePay(
  minutes: number,
  isHoliday: boolean,
  monthlyBase: number,
  s: OvertimeSettings,
  flatRateOverride?: number,
): number {
  if (minutes <= 0) return 0;
  if (s.mode === "flat") return Math.round((minutes / 60) * (flatRateOverride ?? s.flatRatePerHour));
  const hourly = monthlyBase / s.hourlyDivisor;
  const weighted = overtimeBreakdown(minutes, isHoliday, s).reduce((sum, b) => sum + b.hours * b.multiplier, 0);
  return Math.round(hourly * weighted);
}

/** Menit lembur per entri (urut jam mulai): menit setelah akumulasi melewati batas normal. */
export function overtimePerEntry(entries: DayEntry[], normalHoursPerDay: number, isHoliday: boolean): number[] {
  const cap = isHoliday ? 0 : Math.round(normalHoursPerDay * 60);
  const lengths = entries.map((e) => toMinutes(e.end) - toMinutes(e.start));
  return lengths.map((len, i) => {
    const before = lengths.slice(0, i).reduce((s, l) => s + l, 0);
    return len - Math.max(0, Math.min(len, cap - before));
  });
}
