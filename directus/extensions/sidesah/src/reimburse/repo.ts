/**
 * Baca data reimburse dari database lalu ubah ke bentuk tipe frontend (web/src/lib/types.ts),
 * supaya logic di web/src/lib/calc bisa dipakai apa adanya di server.
 */
import type { Knex } from "knex";
import type { ReimburseSettings } from "../../../../../web/src/lib/settings-types";
import type { BankAccount, Reimbursement, ReimbursementCategory, ReimbursementItem, ReimbursementStatus, User } from "../../../../../web/src/lib/types";
import { appRoleOf } from "../../../../access/roles";
import { fullName, ymd } from "../lib/context";

type ClaimRow = { id: string; number: string; claimant: string; title: string; submitted_at: string | Date; status: ReimbursementStatus; sponsor: string | null; paid_at: string | Date | null };
type ItemRow = { id: string; claim: string; date: string | Date; description: string; category: string; project_code: string | null; amount_usd_cents: number | null; amount: number; declined_note: string | null; declined_by: string | null; sort: number | null };
type FileRow = { item: string; id: string; filename_download: string; sha256: string | null };

export { ymd };

export type ClaimMeta = { id: string; number: string; claimant: string; sponsor: string | null; status: ReimbursementStatus };

async function loadMany(db: Knex, rows: ClaimRow[]): Promise<Reimbursement[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const itemRows = await db<ItemRow>("reimbursement_items").whereIn("claim", ids).orderBy("sort");
  const files = await db("reimbursement_item_files as j")
    .join("directus_files as f", "f.id", "j.directus_files_id")
    .whereIn("j.reimbursement_items_id", itemRows.map((i) => i.id))
    .select<FileRow[]>("j.reimbursement_items_id as item", "f.id", "f.filename_download", "f.sha256");
  const toItem = (i: ItemRow): ReimbursementItem => ({
    id: i.id, date: ymd(i.date), description: i.description, categoryId: i.category, projectCode: i.project_code,
    amountUsdCents: i.amount_usd_cents, amount: i.amount,
    files: files.filter((f) => f.item === i.id).map((f) => ({ name: f.filename_download, url: f.id, hash: f.sha256 ?? undefined })),
    declined: i.declined_note ? { note: i.declined_note, byUserId: i.declined_by ?? "" } : null,
  });
  return rows.map((r) => ({
    id: r.id, number: r.number, userId: r.claimant, title: r.title, submittedAt: ymd(r.submitted_at),
    items: itemRows.filter((i) => i.claim === r.id).map(toItem), status: r.status,
    paidAt: r.paid_at ? ymd(r.paid_at) : null, payment: null, logs: [],
  }));
}

const CLAIM_COLS = ["id", "number", "claimant", "title", "submitted_at", "status", "sponsor", "paid_at"];

export async function loadClaim(db: Knex, id: string): Promise<(Reimbursement & { sponsorId: string | null }) | null> {
  const row = await db("reimbursements").where({ id }).first<ClaimRow | undefined>(CLAIM_COLS);
  if (!row) return null;
  const [claim] = await loadMany(db, [row]);
  return { ...claim, sponsorId: row.sponsor };
}

/** Pengajuan lain untuk deteksi struk ganda (12 bulan terakhir cukup, karena struk > 6 bulan ditolak). */
export async function loadRecentClaims(db: Knex, sinceDate: string): Promise<Reimbursement[]> {
  const rows = await db("reimbursements").where("submitted_at", ">=", sinceDate).select<ClaimRow[]>(CLAIM_COLS);
  return loadMany(db, rows);
}

export async function existingNumbers(db: Knex, prefix: string): Promise<string[]> {
  const rows = await db<{ number: string }>("reimbursements").where("number", "like", `${prefix}%`).select("number");
  return rows.map((r) => r.number);
}

type SettingsRow = { reimburse_usd_rate: number; reimburse_usd_rate_auto: boolean | null; reimburse_pay_days: number[] | string; reimburse_lead_days: number; reimburse_max_receipt_age_months: number; reimburse_require_verified_account: boolean };

export async function reimburseSettings(db: Knex): Promise<ReimburseSettings> {
  const s = await db<SettingsRow>("app_settings").first();
  const payDays = typeof s?.reimburse_pay_days === "string" ? (JSON.parse(s.reimburse_pay_days) as number[]) : (s?.reimburse_pay_days ?? [3, 5]);
  return {
    usdRate: s?.reimburse_usd_rate ?? 16500,
    usdRateAuto: s?.reimburse_usd_rate_auto ?? false,
    payDays,
    leadDays: s?.reimburse_lead_days ?? 2,
    maxReceiptAgeMonths: s?.reimburse_max_receipt_age_months ?? 6,
    requireVerifiedAccount: s?.reimburse_require_verified_account ?? true,
  };
}

export async function holidaySet(db: Knex): Promise<Set<string>> {
  const rows = await db<{ date: string | Date }>("holidays").select("date");
  return new Set(rows.map((r) => ymd(r.date)));
}

export async function categories(db: Knex): Promise<ReimbursementCategory[]> {
  const rows = await db<{ id: string; name: string; limit_per_item: number | null }>("reimbursement_categories").select("id", "name", "limit_per_item");
  return rows.map((c) => ({ id: c.id, name: c.name, limitPerItem: c.limit_per_item }));
}

type BankRow = { bank_name: string; account_number: string; account_holder: string; verified: boolean; verified_by: string | null; date_updated: Date | string | null; date_created: Date | string | null };

export async function bankAccountOf(db: Knex, userId: string): Promise<BankAccount | null> {
  const b = await db<BankRow & { owner: string }>("bank_accounts").where({ owner: userId }).first();
  if (!b) return null;
  const updated = b.date_updated ?? b.date_created ?? new Date();
  return {
    bankName: b.bank_name, accountNumber: b.account_number, accountHolder: b.account_holder, verified: b.verified,
    verifiedBy: b.verified_by, updatedAt: typeof updated === "string" ? updated : updated.toISOString(),
  };
}

type UserRow = { id: string; role: string | null; first_name: string | null; last_name: string | null; email: string | null; status: string; employee_code: string | null; team: string | null; position: string | null; join_date: string | Date | null; external_company: string | null; sponsor: string | null; access_until: string | Date | null };

/** Pengguna dalam bentuk tipe frontend (dipakai cek risiko & alur external). */
export async function loadUser(db: Knex, id: string): Promise<User | null> {
  const u = await db<UserRow>("directus_users").where({ id }).first();
  if (!u) return null;
  const role = appRoleOf(u.role) ?? "employee";
  return {
    id: u.id, employeeCode: u.employee_code ?? "", name: fullName(u), email: u.email ?? "", role, teamId: u.team ?? "",
    position: u.position ?? "", joinDate: ymd(u.join_date), active: u.status === "active",
    bankAccount: await bankAccountOf(db, u.id),
    external: role === "external" ? { company: u.external_company ?? "", sponsorId: u.sponsor ?? "", accessUntil: ymd(u.access_until) } : null,
  };
}
