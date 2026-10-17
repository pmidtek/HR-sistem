/** Ambil data yang dipakai modul yang sudah dirilis (Reimburse, Dashboard, Approvals, Employees, Settings). */
import type { AppSettings } from "../settings-types";
import type { Holiday, Notification, Reimbursement, ReimbursementCategory, Team, User } from "../types";
import { apiGet } from "./client";
import {
  toCategory, toClaims, toHoliday, toNotification, toSettings, toTeam, toUsers,
  type BankRow, type ClaimRow, type LogRow, type NotificationRow, type SettingsRow, type UserRow,
} from "./mappers";

const ALL = { limit: -1 };

const FILE = ["id", "filename_download", "sha256"].map((f) => `directus_files_id.${f}`);
export const CLAIM_FIELDS = [
  "id", "number", "claimant", "title", "submitted_at", "status", "paid_at",
  "paid_to_bank_name", "paid_to_account_number", "paid_to_account_last4", "paid_to_account_holder",
  ...["id", "sort", "date", "description", "category", "project_code", "amount_usd_cents", "amount", "declined_note", "declined_by"].map((f) => `items.${f}`),
  ...FILE.map((f) => `items.files.${f}`),
  ...["date", "method", "reference", "paid_by"].map((f) => `payment.${f}`),
  ...FILE.map((f) => `payment.proof_files.${f}`),
].join(",");

const USER_FIELDS = "id,first_name,last_name,email,role,status,employee_code,team,position,join_date,external_company,sponsor,access_until";

export type LoadedData = {
  users: User[];
  teams: Team[];
  holidays: Holiday[];
  reimbursementCategories: ReimbursementCategory[];
  reimbursements: Reimbursement[];
  notifications: Notification[];
  settings: AppSettings;
};

export async function loadUsers(): Promise<User[]> {
  const [users, banks] = await Promise.all([
    apiGet<UserRow[]>("/users", { fields: USER_FIELDS, ...ALL }),
    apiGet<BankRow[]>("/items/bank_accounts", ALL),
  ]);
  return toUsers(users, banks);
}

export async function loadClaims(): Promise<Reimbursement[]> {
  const [rows, logs] = await Promise.all([
    apiGet<ClaimRow[]>("/items/reimbursements", { fields: CLAIM_FIELDS, sort: "-submitted_at,-number", deep: { items: { _sort: ["sort"] } }, ...ALL }),
    apiGet<LogRow[]>("/items/approval_logs", {
      fields: "subject_id,from_status,to_status,note,actor,date_created", filter: { subject_collection: { _eq: "reimbursements" } }, sort: "date_created", ...ALL,
    }),
  ]);
  return toClaims(rows, logs);
}

export async function loadNotifications(userId: string): Promise<Notification[]> {
  const rows = await apiGet<NotificationRow[]>("/items/notifications", { filter: { recipient: { _eq: userId } }, sort: "-date_created", limit: 100 });
  return rows.map(toNotification);
}

export async function loadAll(userId: string, base: AppSettings): Promise<LoadedData> {
  const [users, teams, holidays, categories, reimbursements, notifications, settings] = await Promise.all([
    loadUsers(),
    apiGet<{ id: string; name: string; kind: string }[]>("/items/teams", { sort: "sort,name", ...ALL }).catch(() => []),
    apiGet<{ date: string; name: string }[]>("/items/holidays", { sort: "date", ...ALL }),
    apiGet<{ id: string; name: string; limit_per_item: number | null; active: boolean }[]>("/items/reimbursement_categories", { sort: "sort,name", ...ALL }),
    loadClaims(),
    loadNotifications(userId),
    apiGet<SettingsRow>("/items/app_settings"),
  ]);
  return {
    users, teams: teams.map(toTeam), holidays: holidays.map(toHoliday), reimbursementCategories: categories.map(toCategory),
    reimbursements, notifications, settings: toSettings(settings ?? {}, base),
  };
}
