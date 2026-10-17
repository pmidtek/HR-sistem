import type { Reimbursement, ReimbursementItem, ReimbursementStatus } from "../types";
import { addDays, addMonths, dayOfWeek } from "./dates";

/** Satu baris di lembar input reimburse (sebelum disimpan). */
export type ReimburseRowInput = Pick<ReimbursementItem, "date" | "description" | "categoryId" | "projectCode" | "amountUsdCents" | "amount" | "files">;

export type RowErrors = Partial<Record<keyof ReimburseRowInput, string>>;

/** Tanggal struk paling lama yang masih boleh diajukan (16 Okt, 6 bulan → 16 Apr). */
export function oldestReceiptDate(today: string, maxAgeMonths: number): string {
  return addMonths(today, -maxAgeMonths);
}

/** `maxAgeMonths` = umur maksimal struk (bulan); lebih tua dari itu ditolak supaya struk lama tidak "didaur ulang". */
export function validateReimburseRow(row: ReimburseRowInput, today: string, maxAgeMonths?: number): RowErrors {
  const e: RowErrors = {};
  if (!row.date || row.date > today) e.date = "Date can't be in the future.";
  else if (maxAgeMonths && row.date < oldestReceiptDate(today, maxAgeMonths)) e.date = `Receipts older than ${maxAgeMonths} months can't be claimed.`;
  if (!row.description.trim()) e.description = "Description is required.";
  if (!row.categoryId) e.categoryId = "Pick a category.";
  if (row.amountUsdCents !== null && (!Number.isInteger(row.amountUsdCents) || row.amountUsdCents <= 0)) e.amountUsdCents = "Invalid USD amount.";
  if (!Number.isInteger(row.amount) || row.amount <= 0) e.amount = "Enter the cost in IDR.";
  if (row.files.length === 0) e.files = "Attach at least 1 receipt.";
  return e;
}

/** Baris yang benar-benar kosong diabaikan saat submit. */
export function isBlankRow(row: ReimburseRowInput): boolean {
  return !row.categoryId && row.amount === 0 && row.amountUsdCents === null && !row.description.trim() && row.files.length === 0;
}

/** Kode project: huruf besar, spasi dibuang; kosong = null (boleh dilewati). */
export function normalizeProjectCode(raw: string): string | null {
  const v = raw.trim().toUpperCase().replace(/\s+/g, "");
  return v === "" ? null : v;
}

/** USD (sen) → Rupiah dengan kurs per $1, dibulatkan ke rupiah terdekat. */
export function usdToIdr(cents: number, rate: number): number {
  return Math.round((cents * rate) / 100);
}

/** "22.5" / "22,50" / "$22" → 2250 sen; teks kosong → null. */
export function parseUsdCents(raw: string): number | null {
  const v = raw.replace(/[^\d.,]/g, "").replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const activeItems = (r: Pick<Reimbursement, "items">) => r.items.filter((i) => !i.declined);

/** Total yang diganti: hanya baris yang tidak ditolak. Pengajuan yang ditolak seluruhnya = 0. */
export function claimTotal(r: Pick<Reimbursement, "items" | "status">): number {
  if (r.status === "rejected") return 0;
  return activeItems(r).reduce((s, i) => s + i.amount, 0);
}

/** Total yang diajukan pegawai (semua baris). */
export function claimGross(r: Pick<Reimbursement, "items">): number {
  return r.items.reduce((s, i) => s + i.amount, 0);
}

/** Total yang ditolak: baris yang ditolak, atau seluruh pengajuan jika ditolak. */
export function claimDeclined(r: Pick<Reimbursement, "items" | "status">): number {
  return claimGross(r) - claimTotal(r);
}

export type PaymentState = "paid" | "unpaid" | "none";

/** Status pembayaran: hanya yang sudah disetujui yang bisa "belum dibayar". */
export function paymentState(status: ReimbursementStatus): PaymentState {
  if (status === "paid") return "paid";
  if (status === "approved") return "unpaid";
  return "none";
}

/** Tahap di alur pembayaran, dipakai infografik. */
export type Stage = "finance" | "stakeholder" | "revision" | "unpaid" | "paid" | "rejected";

export function stageOf(status: ReimbursementStatus): Stage {
  switch (status) {
    case "pending_sponsor":
    case "pending_finance": return "finance";
    case "pending_stakeholder": return "stakeholder";
    case "revision": return "revision";
    case "approved": return "unpaid";
    case "paid": return "paid";
    case "rejected": return "rejected";
  }
}

export type StageTotals = Record<Stage, { count: number; amount: number }>;

/** Jumlah & nominal per tahap. Untuk yang ditolak, nominalnya = yang diajukan. */
export function stageTotals(list: Reimbursement[]): StageTotals {
  const t: StageTotals = {
    finance: { count: 0, amount: 0 }, stakeholder: { count: 0, amount: 0 }, revision: { count: 0, amount: 0 },
    unpaid: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, rejected: { count: 0, amount: 0 },
  };
  for (const r of list) {
    const s = t[stageOf(r.status)];
    s.count += 1;
    s.amount += r.status === "rejected" ? claimGross(r) : claimTotal(r);
  }
  return t;
}

export type RecapTotals = { count: number; total: number; inProcess: number; unpaid: number; paid: number; declined: number };

function emptyTotals(): RecapTotals {
  return { count: 0, total: 0, inProcess: 0, unpaid: 0, paid: 0, declined: 0 };
}

function add(t: RecapTotals, r: Reimbursement): void {
  const amount = claimTotal(r);
  const stage = stageOf(r.status);
  t.count += 1;
  t.total += claimGross(r);
  if (stage === "finance" || stage === "stakeholder" || stage === "revision") t.inProcess += amount;
  if (stage === "unpaid") t.unpaid += amount;
  if (stage === "paid") t.paid += amount;
  t.declined += claimDeclined(r);
}

/** Rekap per kunci (mis. pegawai). Semua uang integer Rupiah. */
export function recapBy(list: Reimbursement[], key: (r: Reimbursement) => string): Map<string, RecapTotals> {
  const out = new Map<string, RecapTotals>();
  for (const r of list) {
    const k = key(r);
    const t = out.get(k) ?? emptyTotals();
    add(t, r);
    out.set(k, t);
  }
  return out;
}

export function recapTotals(list: Reimbursement[]): RecapTotals {
  const t = emptyTotals();
  for (const r of list) add(t, r);
  return t;
}

/** Jumlah per kunci baris (kategori/project/bulan), hanya baris yang ikut diganti. */
export function sumItemsBy(list: Reimbursement[], key: (i: ReimbursementItem) => string): Map<string, { amount: number; count: number }> {
  const out = new Map<string, { amount: number; count: number }>();
  for (const r of list) {
    if (r.status === "rejected") continue;
    for (const i of activeItems(r)) {
      const k = key(i);
      const t = out.get(k) ?? { amount: 0, count: 0 };
      t.amount += i.amount;
      t.count += 1;
      out.set(k, t);
    }
  }
  return out;
}

/** Bulan pengajuan (YYYY-MM); dasar rekap bulanan. */
export const claimMonth = (r: Pick<Reimbursement, "submittedAt">) => r.submittedAt.slice(0, 7);

/** Rangkaian bulan [from..to] (YYYY-MM, inklusif). */
export function monthSpan(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to && out.length < 120; m = addMonths(`${m}-01`, 1).slice(0, 7)) out.push(m);
  return out;
}

/** Pilihan bulan di rekap bulanan: satu bulan, atau rentang bulan (YYYY-MM). */
export type MonthSelection = { kind: "month"; month: string } | { kind: "range"; from: string; to: string };

/** Bulan yang dipilih, terbaru di depan. Rentang dibatasi 24 bulan terakhir. */
export function selectedMonths(sel: MonthSelection): string[] {
  const list = sel.kind === "month" ? [sel.month] : sel.from <= sel.to ? monthSpan(sel.from, sel.to) : monthSpan(sel.to, sel.from);
  return list.slice(-24).reverse();
}

export type EmployeeMonthly = { userId: string; months: Map<string, RecapTotals>; total: RecapTotals };

/** Rekap per pegawai per bulan pengajuan (hanya bulan di `months`). Urut dari yang terbesar. */
export function monthlyByEmployee(list: Reimbursement[], months: string[]): EmployeeMonthly[] {
  const inMonths = new Set(months);
  const out = new Map<string, EmployeeMonthly>();
  for (const r of list) {
    const m = claimMonth(r);
    if (!inMonths.has(m)) continue;
    const e = out.get(r.userId) ?? { userId: r.userId, months: new Map(), total: emptyTotals() };
    const t = e.months.get(m) ?? emptyTotals();
    add(t, r);
    add(e.total, r);
    e.months.set(m, t);
    out.set(r.userId, e);
  }
  return [...out.values()].sort((a, b) => reimbursed(b.total) - reimbursed(a.total));
}

/** Nominal yang diganti (diajukan − ditolak): dalam review + belum dibayar + sudah dibayar. */
export const reimbursed = (t: RecapTotals) => t.inProcess + t.unpaid + t.paid;

/** Nomor pengajuan berikutnya: RB-YYMM-NNN (urut per bulan). */
export function nextClaimNumber(existing: string[], today: string): string {
  const prefix = `RB-${today.slice(2, 4)}${today.slice(5, 7)}-`;
  const max = existing.filter((n) => n.startsWith(prefix)).reduce((m, n) => Math.max(m, Number(n.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/**
 * Perkiraan tanggal bayar: hari bayar pertama (mis. Rabu/Jumat) yang ≥ tanggal pengajuan + leadDays,
 * melewati hari libur. Contoh (Rabu & Jumat, 2 hari): Senin → Rabu, Rabu → Jumat, Kamis → Rabu depan.
 */
export function estimatedPayDate(submittedAt: string, rule: { payDays: number[]; leadDays: number }, holidays: Set<string> = new Set()): string {
  if (rule.payDays.length === 0) return addDays(submittedAt, rule.leadDays);
  let d = addDays(submittedAt, Math.max(0, rule.leadDays));
  for (let i = 0; i < 60; i++, d = addDays(d, 1)) {
    if (rule.payDays.includes(dayOfWeek(d)) && !holidays.has(d)) return d;
  }
  return d;
}

/** Filter periode: semua, per tahun, per bulan, atau rentang tanggal (inklusif). */
export type PeriodFilter =
  | { kind: "all" }
  | { kind: "year"; year: number }
  | { kind: "month"; month: string }
  | { kind: "range"; from: string; to: string };

export function inPeriod(date: string, f: PeriodFilter): boolean {
  switch (f.kind) {
    case "all": return true;
    case "year": return date.startsWith(`${f.year}-`);
    case "month": return date.startsWith(f.month);
    case "range": return (!f.from || date >= f.from) && (!f.to || date <= f.to);
  }
}
