import { eachDay, isWeekend } from "./dates";

/** Jumlah hari kerja dalam rentang (inklusif), tidak termasuk akhir pekan & libur nasional. */
export function countWorkingDays(
  start: string,
  end: string,
  holidays: Set<string>,
  workdaysPerWeek: 5 | 6 = 5,
): number {
  if (!start || !end || end < start) return 0;
  return eachDay(start, end).filter((d) => !isWeekend(d, workdaysPerWeek) && !holidays.has(d)).length;
}

/** Cek apakah saldo cukup. Saldo tidak boleh minus. */
export function hasSufficientBalance(quota: number, used: number, requested: number): boolean {
  return quota - used - requested >= 0;
}
