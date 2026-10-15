import { parseDate } from "./calc/dates";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Rp1.250.000 — titik pemisah ribuan, tanpa desimal. */
export function formatRupiah(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}Rp${formatNumber(Math.abs(amount))}`;
}

export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** DD MMM YYYY, contoh: 05 Oct 2026 */
export function formatDate(date: string): string {
  const d = parseDate(date);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDayShort(date: string): string {
  const d = parseDate(date);
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function dayName(date: string): string {
  return DAYS[parseDate(date).getUTCDay()];
}

/** "2026-10" → "October 2026" */
export function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** 135 → "2h 15m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** 135 → "2,25" */
export function formatHours(minutes: number): string {
  return (minutes / 60).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

/** Terbilang Bahasa Indonesia untuk integer ≥ 0. */
export function terbilang(n: number): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return "nol";
  return spell(value).replace(/\s+/g, " ").trim();
}

function spell(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${spell(n - 10)} belas`;
  if (n < 100) return `${spell(Math.floor(n / 10))} puluh ${spell(n % 10)}`;
  if (n < 200) return `seratus ${spell(n - 100)}`;
  if (n < 1000) return `${spell(Math.floor(n / 100))} ratus ${spell(n % 100)}`;
  if (n < 2000) return `seribu ${spell(n - 1000)}`;
  if (n < 1_000_000) return `${spell(Math.floor(n / 1000))} ribu ${spell(n % 1000)}`;
  if (n < 1_000_000_000) return `${spell(Math.floor(n / 1_000_000))} juta ${spell(n % 1_000_000)}`;
  if (n < 1_000_000_000_000) return `${spell(Math.floor(n / 1_000_000_000))} miliar ${spell(n % 1_000_000_000)}`;
  return `${spell(Math.floor(n / 1_000_000_000_000))} triliun ${spell(n % 1_000_000_000_000)}`;
}

/** Waktu relatif singkat: "just now", "5 mnt lalu", "3 jam lalu", "2 hr lalu", "4 bln lalu", "1 thn lalu". */
export function formatRelative(iso: string, nowIso: string): string {
  const sec = Math.max(0, (Date.parse(nowIso) - Date.parse(iso)) / 1000);
  if (sec < 60) return "just now";
  const min = sec / 60;
  if (min < 60) return `${Math.floor(min)}m ago`;
  const hr = min / 60;
  if (hr < 24) return `${Math.floor(hr)}h ago`;
  const day = hr / 24;
  if (day < 30) return `${Math.floor(day)}d ago`;
  if (day < 365) return `${Math.floor(day / 30)}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}
