/** Timesheet, cuti, lembur, payroll & slip gaji. */
import { collection, folder } from "./dsl";

folder("grp_time", "schedule", "Timesheet, cuti, lembur", "Timesheet, leave & overtime", 5);
folder("grp_payroll", "account_balance_wallet", "Payroll & slip gaji", "Payroll", 6);

const APPROVAL = ["pending_hr", "pending_stakeholder", "approved", "rejected", "cancelled"];

collection("timesheet_entries", { icon: "schedule", group: "grp_time", display: "{{date}} {{project_code}}" }, (c) => {
  c.m2o("employee", "directus_users", { required: true, onDelete: "CASCADE", indexed: true, width: "half" })
    .date("date", { required: true, indexed: true, width: "half" })
    .string("project_code", { required: true, max: 40, width: "half", note: "OPYYXXXX / PRYYXXXX / INTERNAL" })
    .m2o("activity", "activity_codes", { required: true, width: "half", display: "{{name}}" })
    .time("start_time", { required: true, width: "half", note: "Kelipatan 15 menit" })
    .time("end_time", { required: true, width: "half" })
    .text("description", { required: true })
    .boolean("locked", { default: false, readonly: true, note: "Terkunci jika sudah masuk lembur yang disetujui" })
    .stamps(["created", "updated"]);
});

collection("leave_types", { icon: "beach_access", group: "grp_time", display: "{{name}}", sort: true }, (c) => {
  c.string("code", { required: true, unique: true, max: 40, width: "half" })
    .string("name", { required: true, width: "half" })
    .integer("quota_days", { width: "half", note: "Kuota hari kerja per tahun; kosong = tanpa batas" })
    .integer("attachment_after_days", { width: "half", note: "Wajib lampiran jika lebih dari N hari" })
    .boolean("deducts_balance", { default: false, width: "half" })
    .boolean("unpaid", { default: false, width: "half", note: "Memotong gaji (cuti tanpa gaji)" })
    .boolean("active", { default: true });
});

collection("leave_balances", { icon: "account_balance_wallet", group: "grp_time", display: "{{year}}" }, (c) => {
  c.m2o("employee", "directus_users", { required: true, onDelete: "CASCADE", width: "half" })
    .m2o("leave_type", "leave_types", { required: true, onDelete: "CASCADE", width: "half", display: "{{name}}" })
    .integer("year", { required: true, width: "half" })
    .integer("quota", { required: true, default: 0, width: "half" })
    .integer("used", { required: true, default: 0, readonly: true, width: "half" })
    .string("unique_key", { unique: true, hidden: true, readonly: true, max: 100, note: "employee:leave_type:year (diisi hook, mencegah dobel)" });
});

collection("leave_requests", { icon: "event_busy", group: "grp_time", display: "{{start_date}} – {{end_date}}" }, (c) => {
  c.m2o("employee", "directus_users", { required: true, onDelete: "CASCADE", width: "half" })
    .m2o("leave_type", "leave_types", { required: true, width: "half", display: "{{name}}" })
    .date("start_date", { required: true, width: "half" })
    .date("end_date", { required: true, width: "half" })
    .integer("working_days", { required: true, readonly: true, width: "half" })
    .choice("status", APPROVAL, { required: true, default: "pending_hr", readonly: true, indexed: true, width: "half" })
    .text("reason")
    .m2o("attachment", "directus_files")
    .stamps(["created", "updated"]);
});

collection("overtime_requests", { icon: "nightlight", group: "grp_time", display: "{{date}}" }, (c) => {
  c.m2o("employee", "directus_users", { required: true, onDelete: "CASCADE", width: "half" })
    .date("date", { required: true, width: "half" })
    .boolean("is_holiday", { default: false, readonly: true, width: "half" })
    .integer("requested_minutes", { required: true, readonly: true, width: "half" })
    .integer("approved_minutes", { readonly: true, width: "half" })
    .choice("status", APPROVAL, { required: true, default: "pending_hr", readonly: true, indexed: true, width: "half" })
    .text("reason")
    .stamps(["created", "updated"]);
});

/** Profil gaji dengan tanggal berlaku: gaji naik tidak mengubah payroll bulan lalu. */
collection("salary_profiles", { icon: "badge", group: "grp_payroll", display: "{{effective_from}}" }, (c) => {
  c.m2o("employee", "directus_users", { required: true, onDelete: "CASCADE", width: "half" })
    .date("effective_from", { required: true, width: "half" })
    .integer("base_salary", { required: true, width: "half" })
    .choice("ptkp", ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"], { required: true, default: "TK/0", width: "half" })
    .string("npwp", { width: "half" })
    .boolean("bpjs_enrolled", { default: true, width: "half" })
    .integer("overtime_flat_rate", { width: "half", note: "Tarif lembur flat khusus pegawai ini (opsional)" })
    .stamps(["created", "updated", "user_updated"]);
});

collection("salary_allowances", { icon: "add_card", group: "grp_payroll", display: "{{name}}", sort: true }, (c) => {
  c.m2o("profile", "salary_profiles", { required: true, onDelete: "CASCADE", reverse: "allowances" })
    .string("name", { required: true, width: "half" })
    .integer("amount", { required: true, width: "half" });
});

collection("payroll_runs", { icon: "payments", group: "grp_payroll", display: "{{period}}" }, (c) => {
  c.string("period", { required: true, unique: true, max: 7, width: "half", note: "YYYY-MM" })
    .choice("status", ["draft", "pending", "returned", "approved", "transferred"], { required: true, default: "draft", readonly: true, width: "half" })
    .date("period_start", { required: true, width: "half" })
    .date("period_end", { required: true, width: "half" })
    .m2o("approved_by", "directus_users", { readonly: true, width: "half" })
    .timestamp("approved_at", { readonly: true, width: "half" })
    .timestamp("transferred_at", { readonly: true, width: "half" })
    .stamps(["created", "updated"]);
});

collection("payslips", { icon: "description", group: "grp_payroll", display: "{{number}}" }, (c) => {
  c.string("number", { required: true, unique: true, max: 20, readonly: true, width: "half", note: "SG/YYYY/MM/NNNN" })
    .m2o("run", "payroll_runs", { required: true, onDelete: "CASCADE", reverse: "payslips", width: "half" })
    .m2o("employee", "directus_users", { required: true, width: "half" })
    .json("input", { note: "Input perhitungan (termasuk input manual Finance)" })
    .json("overtime_details")
    .integer("total_earnings", { readonly: true, width: "half" })
    .integer("total_deductions", { readonly: true, width: "half" })
    .integer("take_home_pay", { readonly: true, width: "half" })
    .m2o("pdf", "directus_files", { readonly: true })
    .stamps(["created", "updated"]);
});

collection("payslip_lines", { icon: "list", group: "grp_payroll", display: "{{label}}", sort: true }, (c) => {
  c.m2o("payslip", "payslips", { required: true, onDelete: "CASCADE", reverse: "lines" })
    .string("label", { required: true, width: "half" })
    .integer("amount", { required: true, width: "half" })
    .choice("kind", ["earning", "deduction"], { required: true, width: "half" })
    .boolean("mandatory", { default: false, width: "half" });
});
