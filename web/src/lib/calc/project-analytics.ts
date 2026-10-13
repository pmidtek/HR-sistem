/** Agregasi untuk Analytics project: distribusi task & jam timesheet. */
import type { TimesheetEntry } from "../types";
import { startOfWeek } from "./dates";
import { entryMinutes } from "./timesheet";

/** Hitung jumlah per kunci. Item dengan banyak kunci (mis. multi-assignee) dihitung di tiap kunci. */
export function countBy<T>(items: T[], keysOf: (item: T) => string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const it of items) for (const k of keysOf(it)) out.set(k, (out.get(k) ?? 0) + 1);
  return out;
}

/** Total jam per minggu (key = Senin minggu tsb), urut tanggal. */
export function hoursPerWeek(entries: TimesheetEntry[]): { week: string; hours: number }[] {
  const m = new Map<string, number>();
  for (const e of entries) {
    const w = startOfWeek(e.date);
    m.set(w, (m.get(w) ?? 0) + entryMinutes(e));
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, min]) => ({ week, hours: Math.round((min / 60) * 10) / 10 }));
}

/** Total jam per orang, terbanyak dulu. */
export function hoursPerPerson(entries: TimesheetEntry[]): { userId: string; hours: number }[] {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.userId, (m.get(e.userId) ?? 0) + entryMinutes(e));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([userId, min]) => ({ userId, hours: Math.round((min / 60) * 10) / 10 }));
}
