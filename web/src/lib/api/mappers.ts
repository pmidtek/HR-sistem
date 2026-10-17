/** Ubah baris dari Directus (snake_case) ke tipe frontend (lib/types.ts). Fungsi murni, ber-unit test. */
import type { AppSettings } from "../settings-types";
import type {
  ApprovalLog, BankAccount, FileRef, Holiday, Notification, Reimbursement, ReimbursementCategory, ReimbursementStatus, Team, TeamKind, User,
} from "../types";
import { assetUrl } from "./client";
import { roleFromId } from "./ids";

export type UserRow = {
  id: string; first_name: string | null; last_name: string | null; email: string | null; role: string | null; status: string;
  employee_code: string | null; team: string | null; position: string | null; join_date: string | null;
  external_company: string | null; sponsor: string | null; access_until: string | null;
};
export type BankRow = {
  owner: string; bank_name: string; account_number?: string | null; account_last4: string | null; account_holder: string;
  verified: boolean; verified_by: string | null; date_updated: string | null; date_created: string | null;
};
type FileRow = { id: string; filename_download: string; sha256?: string | null } | null;
type Junction = { directus_files_id: FileRow };
export type ItemRow = {
  id: string; date: string; description: string; category: string; project_code: string | null; amount_usd_cents: number | null; amount: number;
  declined_note: string | null; declined_by: string | null; files: Junction[] | null;
};
export type PaymentRow = { date: string; method: "transfer" | "payroll"; reference: string | null; paid_by: string | null; proof_files: Junction[] | null } | null;
export type ClaimRow = {
  id: string; number: string; claimant: string; title: string; submitted_at: string; status: ReimbursementStatus; paid_at: string | null;
  paid_to_bank_name: string | null; paid_to_account_number?: string | null; paid_to_account_last4: string | null; paid_to_account_holder: string | null;
  items: ItemRow[] | null; payment: PaymentRow;
};
export type LogRow = { subject_id: string; from_status: string | null; to_status: string; note: string | null; actor: string | null; date_created: string };
export type NotificationRow = { id: string; recipient: string; title: string; body: string | null; href: string | null; read: boolean; date_created: string };
export type SettingsRow = Record<string, unknown>;

const fullName = (u: Pick<UserRow, "first_name" | "last_name" | "email">) => [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Unknown";
const day = (v: string | null) => (v ? v.slice(0, 10) : "");

/** Nomor rekening yang tidak boleh dilihat (bukan pemilik/Finance) diganti •••• + 4 digit terakhir. */
const accountNo = (full: string | null | undefined, last4: string | null) => full ?? `••••${last4 ?? ""}`;

export function toBank(b: BankRow): BankAccount {
  return {
    bankName: b.bank_name, accountNumber: accountNo(b.account_number, b.account_last4), accountHolder: b.account_holder,
    verified: b.verified, verifiedBy: b.verified_by, updatedAt: b.date_updated ?? b.date_created ?? new Date().toISOString(),
  };
}

/** Akun tanpa role SIDESAH (mis. admin teknis) tidak ditampilkan. */
export function toUsers(rows: UserRow[], banks: BankRow[]): User[] {
  const bankBy = new Map(banks.map((b) => [b.owner, b]));
  return rows.flatMap((u) => {
    const role = roleFromId(u.role);
    if (!role) return [];
    const bank = bankBy.get(u.id);
    return [{
      id: u.id, employeeCode: u.employee_code ?? "", name: fullName(u), email: u.email ?? "", role, teamId: u.team ?? "",
      position: u.position ?? "", joinDate: day(u.join_date), active: u.status === "active",
      bankAccount: bank ? toBank(bank) : null,
      external: role === "external" ? { company: u.external_company ?? "", sponsorId: u.sponsor ?? "", accessUntil: day(u.access_until) } : null,
    }];
  });
}

/** File yang tidak boleh dibaca user dikembalikan Directus sebagai null; ditampilkan tanpa preview. */
function toFiles(list: Junction[] | null): FileRef[] {
  return (list ?? []).map((j, i) => {
    const f = j.directus_files_id;
    return f ? { id: f.id, name: f.filename_download, url: assetUrl(f.id), hash: f.sha256 ?? undefined } : { name: `File ${i + 1} (no access)`, url: null };
  });
}

export function toClaims(rows: ClaimRow[], logs: LogRow[]): Reimbursement[] {
  const logsBy = new Map<string, ApprovalLog[]>();
  for (const l of logs) {
    const list = logsBy.get(l.subject_id) ?? [];
    list.push({ at: l.date_created, byUserId: l.actor ?? "", from: l.from_status, to: l.to_status, note: l.note ?? undefined });
    logsBy.set(l.subject_id, list);
  }
  return rows.map((r) => ({
    id: r.id, number: r.number, userId: r.claimant, title: r.title, submittedAt: day(r.submitted_at), status: r.status, paidAt: r.paid_at ? day(r.paid_at) : null,
    items: (r.items ?? []).map((i) => ({
      id: i.id, date: day(i.date), description: i.description, categoryId: i.category, projectCode: i.project_code,
      amountUsdCents: i.amount_usd_cents, amount: i.amount, files: toFiles(i.files),
      declined: i.declined_note ? { note: i.declined_note, byUserId: i.declined_by ?? "" } : null,
    })),
    payment: r.payment ? {
      date: day(r.payment.date), method: r.payment.method, reference: r.payment.reference ?? "", proofFiles: toFiles(r.payment.proof_files),
      byUserId: r.payment.paid_by ?? "",
      toAccount: r.paid_to_bank_name ? { bankName: r.paid_to_bank_name, accountNumber: accountNo(r.paid_to_account_number, r.paid_to_account_last4), accountHolder: r.paid_to_account_holder ?? "" } : null,
    } : null,
    logs: logsBy.get(r.id) ?? [],
  }));
}

export const toNotification = (n: NotificationRow): Notification => ({
  id: n.id, userId: n.recipient, title: n.title, body: n.body ?? "", href: n.href ?? "/dashboard", createdAt: n.date_created, read: n.read,
});

export const toTeam = (t: { id: string; name: string; kind: string }): Team => ({ id: t.id, name: t.name, kind: (t.kind as TeamKind) ?? "delivery" });
export const toHoliday = (h: { date: string; name: string }): Holiday => ({ date: day(h.date), name: h.name });
export const toCategory = (c: { id: string; name: string; limit_per_item: number | null; active: boolean }): ReimbursementCategory => ({
  id: c.id, name: c.name, limitPerItem: c.limit_per_item, active: c.active,
});

const n = (v: unknown, d: number) => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : d);
const b = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const s = <T extends string>(v: unknown, d: T) => (typeof v === "string" && v ? (v as T) : d);

/** Pengaturan dari baris app_settings; tarif BPJS/TER tetap dari default sampai modul payroll dirilis. */
export function toSettings(row: SettingsRow, base: AppSettings): AppSettings {
  const payDays = Array.isArray(row.reimburse_pay_days) ? (row.reimburse_pay_days as number[]) : base.reimburse.payDays;
  return {
    ...base,
    company: { name: s(row.company_name, base.company.name), address: s(row.company_address, ""), logoUrl: typeof row.company_logo === "string" ? assetUrl(row.company_logo) : "" },
    work: {
      normalHoursPerDay: n(row.work_normal_hours_per_day, base.work.normalHoursPerDay), workdaysPerWeek: n(row.work_days_per_week, 5) === 6 ? 6 : 5,
      timesheetBackdateDays: n(row.timesheet_backdate_days, base.work.timesheetBackdateDays), monthlyTargetHours: n(row.monthly_target_hours, base.work.monthlyTargetHours),
    },
    reimburse: {
      usdRate: n(row.reimburse_usd_rate, base.reimburse.usdRate), payDays,
      usdRateAuto: b(row.reimburse_usd_rate_auto, false),
      usdRateUpdatedAt: typeof row.reimburse_usd_rate_updated_at === "string" ? row.reimburse_usd_rate_updated_at : null,
      usdRateSource: typeof row.reimburse_usd_rate_source === "string" ? row.reimburse_usd_rate_source : null, leadDays: n(row.reimburse_lead_days, base.reimburse.leadDays),
      maxReceiptAgeMonths: n(row.reimburse_max_receipt_age_months, base.reimburse.maxReceiptAgeMonths),
      requireVerifiedAccount: b(row.reimburse_require_verified_account, base.reimburse.requireVerifiedAccount),
    },
  };
}
