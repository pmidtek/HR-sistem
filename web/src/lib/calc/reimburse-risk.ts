import type { BankAccount, Reimbursement, ReimbursementCategory, User } from "../types";
import { dayOfWeek, diffDays } from "./dates";

/**
 * Tanda risiko (anti-fraud) untuk peninjau. Tidak memblokir; hanya menyorot hal yang perlu dicek.
 * Aturan yang memblokir (umur struk, rekening belum diverifikasi) ada di validasi & aksi pembayaran.
 */
export type RiskFlag = {
  code: "duplicate_receipt" | "duplicate_file" | "over_limit" | "weekend" | "holder_mismatch" | "account_unverified" | "account_recently_changed" | "no_account" | "external_expired";
  severity: "high" | "medium" | "low";
  message: string;
  itemId?: string;
};

export type RiskContext = {
  all: Reimbursement[];
  owner: User | undefined;
  categories: ReimbursementCategory[];
  holidays: Set<string>;
  today: string;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Nama pemilik rekening dianggap cocok jika semua kata nama pengaju (≥3 huruf) muncul, atau sebaliknya. */
export function holderMatches(holder: string, name: string): boolean {
  const words = (s: string) => s.toLowerCase().split(/\s+/).map(norm).filter((w) => w.length >= 3);
  const h = words(holder);
  const n = words(name);
  if (h.length === 0 || n.length === 0) return false;
  return n.every((w) => h.includes(w)) || h.every((w) => n.includes(w));
}

/** 1234567890 → "•••• 7890". */
export function maskAccount(accountNumber: string): string {
  const digits = accountNumber.replace(/\s/g, "");
  return digits.length <= 4 ? digits : `•••• ${digits.slice(-4)}`;
}

export function riskFlags(r: Reimbursement, ctx: RiskContext): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const others = ctx.all.filter((x) => x.id !== r.id && x.status !== "rejected");
  const catOf = (id: string) => ctx.categories.find((c) => c.id === id);

  for (const i of r.items) {
    if (i.declined) continue;
    // Struk sama diajukan lagi: tanggal + nominal + kategori sama di pengajuan lain (siapa pun).
    const twin = others.find((x) => x.items.some((j) => !j.declined && j.date === i.date && j.amount === i.amount && j.categoryId === i.categoryId));
    if (twin) flags.push({ code: "duplicate_receipt", severity: "high", itemId: i.id, message: `"${i.description}" matches an item in ${twin.number} (same date, amount, and category).` });
    // File yang persis sama (sidik jari isi file) sudah pernah dipakai.
    const hashes = i.files.map((f) => f.hash).filter((h): h is string => !!h);
    const sameFile = hashes.length > 0 && others.find((x) => x.items.some((j) => j.files.some((f) => f.hash && hashes.includes(f.hash))));
    if (sameFile) flags.push({ code: "duplicate_file", severity: "high", itemId: i.id, message: `A receipt file on "${i.description}" was already used in ${sameFile.number}.` });
    const limit = catOf(i.categoryId)?.limitPerItem;
    if (limit && i.amount > limit) flags.push({ code: "over_limit", severity: "medium", itemId: i.id, message: `"${i.description}" is above the ${catOf(i.categoryId)?.name} limit.` });
    const dow = dayOfWeek(i.date);
    if (dow === 0 || dow === 6 || ctx.holidays.has(i.date)) flags.push({ code: "weekend", severity: "low", itemId: i.id, message: `"${i.description}" happened on a weekend or holiday.` });
  }

  const acct: BankAccount | null | undefined = ctx.owner?.bankAccount;
  if (!acct) flags.push({ code: "no_account", severity: "medium", message: "The claimant has no payout bank account yet." });
  else {
    if (!acct.verified) flags.push({ code: "account_unverified", severity: "high", message: "The payout bank account is not verified by Finance yet." });
    if (ctx.owner && !holderMatches(acct.accountHolder, ctx.owner.name)) flags.push({ code: "holder_mismatch", severity: "high", message: `Account holder "${acct.accountHolder}" does not match the claimant's name.` });
    if (diffDays(acct.updatedAt.slice(0, 10), ctx.today) <= 7) flags.push({ code: "account_recently_changed", severity: "medium", message: "The payout bank account was changed in the last 7 days." });
  }
  if (ctx.owner?.role === "external" && ctx.owner.external && ctx.owner.external.accessUntil < ctx.today) {
    flags.push({ code: "external_expired", severity: "medium", message: "This external's access period has ended." });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return flags.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
