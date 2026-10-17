/**
 * Permission per policy. Prinsip:
 * - Status pengajuan & semua aksi approval TIDAK bisa diubah langsung: hanya lewat endpoint /sidesah/* (extension).
 * - Pegawai hanya melihat data miliknya; reviewer melihat sesuai tugasnya (BRIEF.md Bagian 2).
 * - Nomor rekening utuh hanya untuk pemilik & Finance.
 */
import { POLICY, ROLE } from "./roles";

type Filter = Record<string, unknown>;
export type Perm = { policy: string; collection: string; action: "create" | "read" | "update" | "delete"; permissions?: Filter | null; validation?: Filter | null; presets?: Filter | null; fields: string[] };

const ME = "$CURRENT_USER";
const own = (field: string): Filter => ({ [field]: { _eq: ME } });
const any = (...f: Filter[]): Filter => ({ _or: f });
const ALL = ["*"];

const p = (policy: string) => ({
  read: (collection: string, permissions: Filter | null = null, fields = ALL): Perm => ({ policy, collection, action: "read", permissions, fields }),
  update: (collection: string, permissions: Filter | null, fields: string[], validation: Filter | null = null): Perm => ({ policy, collection, action: "update", permissions, fields, validation }),
  create: (collection: string, fields: string[], validation: Filter | null = null, presets: Filter | null = null): Perm => ({ policy, collection, action: "create", fields, validation, presets }),
  remove: (collection: string, permissions: Filter | null = null): Perm => ({ policy, collection, action: "delete", permissions, fields: ALL }),
});

/** Field profil yang boleh dilihat sesama pegawai (tanpa tanggal lahir/telepon). */
const USER_PUBLIC = ["id", "first_name", "last_name", "email", "avatar", "role", "status", "employee_code", "team", "position", "join_date", "external_company", "sponsor", "access_until"];
const USER_EDITABLE = ["first_name", "last_name", "email", "role", "status", "employee_code", "team", "position", "join_date", "birth_date", "phone", "external_company", "sponsor", "access_until", "provider", "external_identifier"];
/** HR/Finance hanya boleh memberi role aplikasi (bukan Administrator). */
const APP_ROLES: Filter = { role: { _in: Object.values(ROLE) } };
const CLAIM_MASKED = ["id", "number", "claimant", "title", "submitted_at", "status", "sponsor", "payment", "paid_at", "paid_to_bank_name", "paid_to_account_last4", "paid_to_account_holder", "items", "date_created", "date_updated"];
const BANK_MASKED = ["id", "owner", "bank_name", "account_last4", "account_holder", "verified", "verified_by", "verified_at", "date_created", "date_updated"];

const SETTINGS_HR = ["company_name", "company_address", "company_logo", "work_normal_hours_per_day", "work_days_per_week", "timesheet_backdate_days", "monthly_target_hours"];
const SETTINGS_FINANCE = ["company_name", "company_address", "company_logo", "overtime_mode", "overtime_hourly_divisor", "overtime_weekday_first_hour", "overtime_weekday_next_hours", "overtime_holiday_first8", "overtime_holiday_hour9", "overtime_holiday_hour10to12", "overtime_flat_rate_per_hour", "payroll_period_mode", "payroll_cutoff_day", "payroll_reimburse_via_payroll", "payroll_payslip_password", "reimburse_usd_rate", "reimburse_usd_rate_auto", "reimburse_pay_days", "reimburse_lead_days", "reimburse_max_receipt_age_months", "reimburse_require_verified_account"];

/** Koleksi anak project (punya field `project`). */
export const PROJECT_CHILDREN = ["project_members", "boards", "board_columns", "epics", "sprints", "tasks", "milestones", "deliverables", "moms", "project_notes", "decisions", "project_links", "client_touchpoints", "client_key_actions", "change_requests", "baselines", "project_activity_logs", "project_join_requests", "project_invite_links"];
const MEMBER: Filter = { project: { members: { user: { _eq: ME } } } };
const EDITOR: Filter = { project: { members: { _and: [{ user: { _eq: ME } }, { role: { _in: ["lead", "member"] } }] } } };

function staffBase(): Perm[] {
  const s = p(POLICY.staffBase);
  const claimMine = any(own("claimant"), own("sponsor"));
  return [
    s.read("directus_users", null, USER_PUBLIC),
    s.read("directus_users", own("id"), [...USER_PUBLIC, "birth_date", "phone", "ms_object_id"]),
    s.update("directus_users", own("id"), ["phone", "avatar"]),
    s.create("directus_files", ALL),
    s.read("directus_folders"),
    // File yang saya upload, struk di klaim saya / klaim external yang saya PIC-i, dan bukti bayar klaim saya.
    s.read("directus_files", any(
      own("uploaded_by"),
      { reimbursement_item_links: { reimbursement_items_id: { claim: claimMine } } },
      { reimbursement_payment_links: { reimbursement_payments_id: { claims: own("claimant") } } },
    )),
    ...["teams", "activity_codes", "holidays", "reimbursement_categories", "leave_types", "app_settings", "companies", "company_contacts", "opportunities"].map((c) => s.read(c)),
    s.read("notifications", own("recipient")),
    s.update("notifications", own("recipient"), ["read"]),
    s.read("bank_accounts", own("owner")),
    // Reimburse: milik sendiri, atau pengajuan external yang saya PIC-nya.
    s.read("reimbursements", claimMine),
    s.read("reimbursement_items", { claim: claimMine }),
    s.read("reimbursement_item_files", { reimbursement_items_id: { claim: claimMine } }),
    s.read("reimbursement_payments", { claims: claimMine }),
    s.read("reimbursement_payment_files", { reimbursement_payments_id: { claims: claimMine } }),
    s.read("approval_logs", any(own("subject_user"), own("subject_sponsor"))),
    // Modul HR: data sendiri. Penulisan lewat endpoint (validasi di server).
    s.read("timesheet_entries", own("employee")),
    s.read("leave_balances", own("employee")),
    s.read("leave_requests", own("employee")),
    s.read("overtime_requests", own("employee")),
    s.read("payslips", { _and: [own("employee"), { run: { status: { _in: ["approved", "transferred"] } } }] }),
    s.read("payslip_lines", { payslip: { _and: [own("employee"), { run: { status: { _in: ["approved", "transferred"] } } }] } }),
    // Project: hanya project yang saya ikuti. Pembuatan item dicek keanggotaannya oleh hook.
    s.read("projects", { members: { user: { _eq: ME } } }),
    s.read("project_teams", { projects_id: { members: { user: { _eq: ME } } } }),
    ...PROJECT_CHILDREN.flatMap((c) => [s.read(c, MEMBER), s.create(c, ALL), s.update(c, EDITOR, ALL), s.remove(c, EDITOR)]),
    s.read("stories", { epic: MEMBER }), s.create("stories", ALL), s.update("stories", { epic: EDITOR }, ALL), s.remove("stories", { epic: EDITOR }),
    s.read("task_comments", { task: MEMBER }), s.create("task_comments", ["task", "body"]), s.update("task_comments", own("user_created"), ["body"]), s.remove("task_comments", own("user_created")),
    s.read("task_assignees", { tasks_id: MEMBER }), s.create("task_assignees", ALL), s.remove("task_assignees", { tasks_id: EDITOR }),
    s.read("task_files", { tasks_id: MEMBER }), s.create("task_files", ALL), s.remove("task_files", { tasks_id: EDITOR }),
    s.read("mom_files", { moms_id: MEMBER }), s.create("mom_files", ALL), s.remove("mom_files", { moms_id: EDITOR }),
  ];
}

function externalBase(): Perm[] {
  const e = p(POLICY.externalBase);
  return [
    e.read("directus_users", any(own("id"), { id: { _eq: "$CURRENT_USER.sponsor" } }), ["id", "first_name", "last_name", "email", "avatar", "role", "status", "employee_code", "team", "position", "join_date", "external_company", "sponsor", "access_until"]),
    e.update("directus_users", own("id"), ["phone", "avatar"]),
    e.create("directus_files", ALL),
    e.read("directus_folders"),
    e.read("directus_files", any(
      own("uploaded_by"),
      { reimbursement_item_links: { reimbursement_items_id: { claim: own("claimant") } } },
      { reimbursement_payment_links: { reimbursement_payments_id: { claims: own("claimant") } } },
    )),
    e.read("reimbursement_categories"),
    e.read("holidays"),
    e.read("app_settings", null, ["id", "company_name", "company_logo", "reimburse_usd_rate", "reimburse_usd_rate_auto", "reimburse_usd_rate_updated_at", "reimburse_usd_rate_source", "reimburse_pay_days", "reimburse_lead_days", "reimburse_max_receipt_age_months"]),
    e.read("notifications", own("recipient")),
    e.update("notifications", own("recipient"), ["read"]),
    e.read("bank_accounts", own("owner")),
    e.read("reimbursements", own("claimant")),
    e.read("reimbursement_items", { claim: own("claimant") }),
    e.read("reimbursement_item_files", { reimbursement_items_id: { claim: own("claimant") } }),
    e.read("reimbursement_payments", { claims: own("claimant") }),
    e.read("reimbursement_payment_files", { reimbursement_payments_id: { claims: own("claimant") } }),
    e.read("approval_logs", own("subject_user")),
  ];
}

/** Reviewer reimburse (Finance, HR, Stakeholder): lihat semua pengajuan & bukti. */
function reimburseReviewer(policy: string, fullBank: boolean): Perm[] {
  const r = p(policy);
  return [
    r.read("reimbursements", null, fullBank ? ALL : CLAIM_MASKED),
    ...["reimbursement_items", "reimbursement_item_files", "reimbursement_payments", "reimbursement_payment_files", "approval_logs", "directus_files"].map((c) => r.read(c)),
    r.read("directus_users", null, [...USER_PUBLIC, "phone", "ms_object_id", "ms_synced_at"]),
    r.read("bank_accounts", null, fullBank ? ALL : BANK_MASKED),
  ];
}

function manageUsers(policy: string): Perm[] {
  const r = p(policy);
  return [
    r.read("directus_users", null, [...USER_PUBLIC, ...USER_EDITABLE, "ms_object_id", "ms_synced_at"]),
    r.create("directus_users", USER_EDITABLE, APP_ROLES),
    // Tidak boleh mengubah akun Administrator / role di luar SIDESAH.
    r.update("directus_users", APP_ROLES, USER_EDITABLE, APP_ROLES),
  ];
}

const crud = (policy: string, collection: string): Perm[] => {
  const r = p(policy);
  return [r.read(collection), r.create(collection, ALL), r.update(collection, null, ALL), r.remove(collection)];
};

function hr(): Perm[] {
  const r = p(POLICY.hr);
  return [
    ...reimburseReviewer(POLICY.hr, false),
    ...manageUsers(POLICY.hr),
    r.update("app_settings", null, SETTINGS_HR),
    ...["holidays", "activity_codes", "teams", "leave_types"].flatMap((c) => crud(POLICY.hr, c)),
    r.read("leave_balances"), r.create("leave_balances", ["employee", "leave_type", "year", "quota"]), r.update("leave_balances", null, ["quota"]),
    ...["timesheet_entries", "leave_requests", "overtime_requests", "projects", "project_teams", ...PROJECT_CHILDREN, "stories", "task_comments", "task_assignees"].map((c) => r.read(c)),
  ];
}

function finance(): Perm[] {
  const r = p(POLICY.finance);
  return [
    ...reimburseReviewer(POLICY.finance, true),
    ...manageUsers(POLICY.finance),
    r.update("app_settings", null, SETTINGS_FINANCE),
    ...["bpjs_rates", "pph21_ter_rates", "reimbursement_categories", "salary_profiles", "salary_allowances"].flatMap((c) => crud(POLICY.finance, c)),
    ...["timesheet_entries", "overtime_requests", "leave_requests", "payroll_runs", "payslips", "payslip_lines"].map((c) => r.read(c)),
  ];
}

function stakeholder(): Perm[] {
  const r = p(POLICY.stakeholder);
  return [
    ...reimburseReviewer(POLICY.stakeholder, false),
    r.update("app_settings", null, ALL),
    ...["holidays", "activity_codes", "teams", "leave_types", "bpjs_rates", "pph21_ter_rates", "reimbursement_categories"].flatMap((c) => crud(POLICY.stakeholder, c)),
    ...["timesheet_entries", "leave_balances", "leave_requests", "overtime_requests", "salary_profiles", "salary_allowances", "payroll_runs", "payslips", "payslip_lines",
      "projects", "project_teams", ...PROJECT_CHILDREN, "stories", "task_comments", "task_assignees", "task_files", "mom_files"].map((c) => r.read(c)),
  ];
}

export function allPermissions(): Perm[] {
  return [...staffBase(), ...externalBase(), ...hr(), ...finance(), ...stakeholder()];
}
