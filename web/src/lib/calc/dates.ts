/**
 * Utilitas tanggal berbasis string "YYYY-MM-DD".
 * Hitungan memakai UTC supaya tidak bergeser karena zona waktu mesin.
 */

const DAY_MS = 86_400_000;

export function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return toDateString(new Date(parseDate(date).getTime() + days * DAY_MS));
}

/** 0 = Minggu ... 6 = Sabtu */
export function dayOfWeek(date: string): number {
  return parseDate(date).getUTCDay();
}

export function isWeekend(date: string, workdaysPerWeek: 5 | 6 = 5): boolean {
  const dow = dayOfWeek(date);
  return dow === 0 || (workdaysPerWeek === 5 && dow === 6);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS);
}

/** Semua tanggal dari start s/d end (inklusif). */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Senin dari minggu yang memuat tanggal tersebut. */
export function startOfWeek(date: string): string {
  const dow = dayOfWeek(date);
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

/** Tanggal hari ini di Asia/Jakarta. */
export function todayJakarta(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isQuarterHour(hhmm: string): boolean {
  return /^\d{2}:\d{2}$/.test(hhmm) && toMinutes(hhmm) % 15 === 0;
}

/** "2026-12" → "2026-12-31" */
export function endOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return toDateString(new Date(Date.UTC(y, m, 0)));
}
