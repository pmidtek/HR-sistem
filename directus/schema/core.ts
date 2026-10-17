/** Koleksi inti: pegawai (ekstensi directus_users), tim, rekening, pengaturan, master data, notifikasi, log approval. */
import { collection, extend, folder } from "./dsl";

folder("grp_people", "groups", "Pegawai, tim, rekening", "People & accounts", 2);
folder("grp_settings", "settings", "Pengaturan & master data (diubah dari halaman Settings SIDESAH)", "Settings & master data", 3);
folder("grp_system", "notifications", "Notifikasi & log approval", "Notifications & logs", 4);

collection("teams", { icon: "groups", group: "grp_people", display: "{{name}}", sort: true }, (c) => {
  c.string("name", { required: true, unique: true })
    .choice("kind", ["sales", "delivery", "support"], { required: true, default: "delivery", note: "sales = akses Sales Pipeline, delivery = Project Board" })
    .boolean("active", { default: true });
});

/**
 * Pegawai = directus_users. Role aplikasi = role Directus (Stakeholder/HR/Finance/Employee/External).
 * Aktif/nonaktif = field bawaan `status` (active / suspended).
 */
extend("directus_users", (c) => {
  c.string("employee_code", { unique: true, note: "EMP-0001 / EXT-0001", width: "half" })
    .m2o("team", "teams", { display: "{{name}}", width: "half" })
    .string("position", { width: "half" })
    .date("join_date", { width: "half" })
    .date("birth_date", { width: "half", note: "Dipakai untuk password PDF slip gaji (opsional)" })
    .string("phone", { width: "half" })
    // Khusus role External (freelance/vendor)
    .string("external_company", { width: "half", note: "External: perusahaan/vendor asal" })
    .m2o("sponsor", "directus_users", { width: "half", note: "External: PIC internal yang mengonfirmasi setiap pengajuan" })
    .date("access_until", { width: "half", note: "External: akses berakhir setelah tanggal ini" })
    // Sinkron Microsoft Entra ID
    .string("ms_object_id", { unique: true, readonly: true, width: "half", note: "Object ID akun Microsoft (diisi otomatis saat sinkron)" })
    .timestamp("ms_synced_at", { readonly: true, width: "half" });
});

/** Satu rekening tujuan pembayaran per orang. Setiap perubahan = belum terverifikasi lagi (diatur endpoint). */
collection("bank_accounts", { icon: "account_balance", group: "grp_people", display: "{{bank_name}} {{account_last4}}" }, (c) => {
  c.m2o("owner", "directus_users", { required: true, unique: true, onDelete: "CASCADE" })
    .string("bank_name", { required: true, width: "half" })
    .string("account_number", { required: true, max: 30, width: "half", note: "Hanya pemilik & Finance yang boleh membaca" })
    .string("account_last4", { max: 4, readonly: true, width: "half", note: "4 digit terakhir, untuk tampilan tersamar" })
    .string("account_holder", { required: true, width: "half" })
    .boolean("verified", { default: false, readonly: true, width: "half" })
    .m2o("verified_by", "directus_users", { readonly: true, width: "half" })
    .timestamp("verified_at", { readonly: true, width: "half" })
    .stamps(["created", "updated"]);
});

/** Semua pengaturan yang bisa diubah HR/Finance dari halaman Settings (satu baris saja). */
collection("app_settings", { icon: "tune", group: "grp_settings", singleton: true }, (c) => {
  c.string("company_name", { required: true, default: "PT Nama Perusahaan" })
    .text("company_address")
    .m2o("company_logo", "directus_files")
    // Jam kerja & timesheet
    .float("work_normal_hours_per_day", { default: 8, width: "half" })
    .integer("work_days_per_week", { default: 5, width: "half", note: "5 atau 6" })
    .integer("timesheet_backdate_days", { default: 7, width: "half" })
    .integer("monthly_target_hours", { default: 168, width: "half" })
    // Lembur
    .choice("overtime_mode", ["depnaker", "flat"], { default: "depnaker", width: "half" })
    .integer("overtime_hourly_divisor", { default: 173, width: "half" })
    .float("overtime_weekday_first_hour", { default: 1.5, width: "half" })
    .float("overtime_weekday_next_hours", { default: 2, width: "half" })
    .float("overtime_holiday_first8", { default: 2, width: "half" })
    .float("overtime_holiday_hour9", { default: 3, width: "half" })
    .float("overtime_holiday_hour10to12", { default: 4, width: "half" })
    .integer("overtime_flat_rate_per_hour", { default: 50000, width: "half" })
    // Payroll
    .choice("payroll_period_mode", ["calendar", "cutoff"], { default: "cutoff", width: "half" })
    .integer("payroll_cutoff_day", { default: 25, width: "half" })
    .boolean("payroll_reimburse_via_payroll", { default: true, width: "half" })
    .boolean("payroll_payslip_password", { default: false, width: "half" })
    // Reimburse
    .integer("reimburse_usd_rate", { default: 16500, width: "half", note: "Kurs USD → Rupiah" })
    .boolean("reimburse_usd_rate_auto", { default: true, width: "half", note: "Perbarui kurs otomatis tiap hari (kurs referensi ECB)" })
    .timestamp("reimburse_usd_rate_updated_at", { readonly: true, width: "half" })
    .string("reimburse_usd_rate_source", { readonly: true, width: "half", max: 100 })
    .json("reimburse_pay_days", { default: [3, 5], width: "half", note: "Hari bayar: 0 = Minggu … 6 = Sabtu" })
    .integer("reimburse_lead_days", { default: 2, width: "half" })
    .integer("reimburse_max_receipt_age_months", { default: 6, width: "half" })
    .boolean("reimburse_require_verified_account", { default: true, width: "half" })
    .stamps(["updated", "user_updated"]);
});

/** Cache kurs harian (diambil dari ECB saat dibutuhkan). Dipakai untuk mengisi IDR sesuai tanggal transaksi. */
collection("fx_rates", { icon: "currency_exchange", group: "grp_settings", display: "{{date}} {{rate}}" }, (c) => {
  c.date("date", { required: true, width: "half", note: "Tanggal transaksi yang diminta" })
    .string("pair", { required: true, max: 10, default: "USD/IDR", width: "half" })
    .integer("rate", { required: true, width: "half", note: "Rupiah per 1 unit" })
    .date("rate_date", { width: "half", note: "Tanggal kurs dari sumber (hari kerja terdekat sebelumnya)" })
    .string("source", { max: 100, width: "half" })
    .string("unique_key", { unique: true, hidden: true, max: 30, note: "pair:date" })
    .stamps(["created"]);
});

collection("bpjs_rates", { icon: "health_and_safety", group: "grp_settings", display: "{{name}}", sort: true }, (c) => {
  c.string("code", { required: true, unique: true, max: 20, width: "half", note: "kes, jht, jp, jkk, jkm" })
    .string("name", { required: true, width: "half" })
    .integer("employee_bps", { required: true, default: 0, width: "half", note: "Basis poin: 1% = 100" })
    .integer("employer_bps", { required: true, default: 0, width: "half" })
    .integer("wage_cap", { width: "half", note: "Batas upah (Rp); kosong = tanpa batas" });
});

collection("pph21_ter_rates", { icon: "percent", group: "grp_settings", display: "{{category}} {{min_income}}" }, (c) => {
  c.choice("category", ["A", "B", "C"], { required: true, width: "half" })
    .integer("rate_bps", { required: true, width: "half", note: "0,25% = 25" })
    .integer("min_income", { required: true, width: "half" })
    .integer("max_income", { width: "half", note: "Kosong = tak terbatas" });
});

collection("holidays", { icon: "event", group: "grp_settings", display: "{{date}} {{name}}" }, (c) => {
  c.date("date", { required: true, unique: true, width: "half" }).string("name", { required: true, width: "half" });
});

collection("activity_codes", { icon: "label", group: "grp_settings", display: "{{name}}", sort: true }, (c) => {
  c.string("code", { required: true, unique: true, max: 40, width: "half" })
    .string("name", { required: true, width: "half" })
    .boolean("active", { default: true });
});

/** Notifikasi in-app (lonceng). Email/Web Push dikirim dari endpoint yang sama (best effort). */
collection("notifications", { icon: "notifications", group: "grp_system", display: "{{title}}" }, (c) => {
  c.m2o("recipient", "directus_users", { required: true, onDelete: "CASCADE", indexed: true })
    .string("title", { required: true })
    .text("body")
    .string("href", { note: "Link di aplikasi, mis. /reimbursements?claim=..." })
    .boolean("read", { default: false })
    .stamps(["created"]);
});

/**
 * Riwayat setiap perubahan status (cuti, lembur, reimburse, payroll). Hanya ditulis oleh endpoint.
 * `subject_user` = pemilik pengajuan, `subject_sponsor` = PIC (external) → dipakai filter hak baca.
 */
collection("approval_logs", { icon: "history", group: "grp_system", display: "{{from_status}} → {{to_status}}" }, (c) => {
  c.choice("subject_collection", ["reimbursements", "leave_requests", "overtime_requests", "payroll_runs"], { required: true, width: "half" })
    .string("subject_id", { required: true, max: 36, indexed: true, width: "half" })
    .m2o("subject_user", "directus_users", { onDelete: "CASCADE", width: "half" })
    .m2o("subject_sponsor", "directus_users", { width: "half" })
    .string("from_status", { max: 40, width: "half" })
    .string("to_status", { required: true, max: 40, width: "half" })
    .text("note")
    .m2o("actor", "directus_users", { width: "half" })
    .stamps(["created"]);
});

/** Sidik jari isi file (SHA-256) untuk mendeteksi struk yang sama dipakai dua kali. Diisi hook saat upload. */
extend("directus_files", (c) => {
  c.string("sha256", { max: 64, indexed: true, readonly: true });
});
