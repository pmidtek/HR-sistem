/**
 * Isi data awal. Sumber data = file dummy frontend (web/src/lib/mock), jadi isinya sama dengan yang sudah dilihat owner.
 *   pnpm seed        → master data saja (pengaturan, BPJS, TER, kategori, libur, activity code, tim, jenis cuti). Aman untuk produksi.
 *   pnpm seed:demo   → + akun demo & contoh reimburse. JANGAN dijalankan di server produksi.
 * Aman diulang: data dicocokkan lewat kode unik (tidak dobel).
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defaultSettings } from "../../web/src/lib/mock/settings";
import { activityCodes, holidays, teams, users } from "../../web/src/lib/mock/people";
import { leaveTypes } from "../../web/src/lib/mock/work";
import { reimbursementCategories, reimbursements } from "../../web/src/lib/mock/reimburse";
import { FOLDER } from "../access/folders";
import { ROLE } from "../access/roles";
import { api, BASE_URL, isMain, log, waitForDirectus } from "./client";

type Row = { id: string };
type Payload = Record<string, unknown>;

/** Cari baris berdasarkan field unik; update kalau ada, buat kalau belum. Mengembalikan id. */
async function upsert(collection: string, keyField: string, data: Payload, updateExisting = true): Promise<string> {
  const path = collection === "directus_users" ? "/users" : `/items/${collection}`;
  const value = encodeURIComponent(String(data[keyField]));
  const found = await api<Row[]>("GET", `${path}?filter[${keyField}][_eq]=${value}&fields=id&limit=1`);
  if (found[0]) {
    if (updateExisting) await api("PATCH", `${path}/${found[0].id}`, data);
    return found[0].id;
  }
  const created = await api<Row>("POST", path, data);
  return created.id;
}

export async function seedMaster(): Promise<void> {
  const s = defaultSettings;
  await api("PATCH", "/items/app_settings", {
    company_name: s.company.name, company_address: s.company.address,
    work_normal_hours_per_day: s.work.normalHoursPerDay, work_days_per_week: s.work.workdaysPerWeek,
    timesheet_backdate_days: s.work.timesheetBackdateDays, monthly_target_hours: s.work.monthlyTargetHours,
    overtime_mode: s.overtime.mode, overtime_hourly_divisor: s.overtime.hourlyDivisor,
    overtime_weekday_first_hour: s.overtime.weekdayFirstHour, overtime_weekday_next_hours: s.overtime.weekdayNextHours,
    overtime_holiday_first8: s.overtime.holidayFirst8, overtime_holiday_hour9: s.overtime.holidayHour9,
    overtime_holiday_hour10to12: s.overtime.holidayHour10to12, overtime_flat_rate_per_hour: s.overtime.flatRatePerHour,
    payroll_period_mode: s.payroll.periodMode, payroll_cutoff_day: s.payroll.cutoffDay,
    payroll_reimburse_via_payroll: s.payroll.reimburseViaPayroll, payroll_payslip_password: s.payroll.payslipPasswordProtected,
    reimburse_usd_rate: s.reimburse.usdRate, reimburse_pay_days: s.reimburse.payDays, reimburse_lead_days: s.reimburse.leadDays,
    reimburse_max_receipt_age_months: s.reimburse.maxReceiptAgeMonths, reimburse_require_verified_account: s.reimburse.requireVerifiedAccount,
  });
  // Pengaturan yang sudah diubah HR/Finance tidak ditimpa: hanya baris baru yang ditambahkan.
  for (const [i, b] of s.bpjs.entries()) {
    await upsert("bpjs_rates", "code", { code: b.id, name: b.name, employee_bps: b.employeeBps, employer_bps: b.employerBps, wage_cap: b.wageCap, sort: i }, false);
  }
  const ter = await api<Row[]>("GET", "/items/pph21_ter_rates?limit=1&fields=id");
  if (ter.length === 0) {
    await api("POST", "/items/pph21_ter_rates", s.ter.map((t) => ({ category: t.category, min_income: t.minIncome, max_income: t.maxIncome, rate_bps: t.rateBps })));
  }
  for (const h of holidays) await upsert("holidays", "date", { date: h.date, name: h.name }, false);
  for (const [i, a] of activityCodes.entries()) await upsert("activity_codes", "code", { code: a.id, name: a.name, active: a.active, sort: i }, false);
  for (const [i, c] of reimbursementCategories.entries()) {
    await upsert("reimbursement_categories", "code", { code: c.id, name: c.name, limit_per_item: c.limitPerItem ?? null, sort: i }, false);
  }
  for (const [i, t] of teams.entries()) await upsert("teams", "name", { name: t.name, kind: t.kind, sort: i }, false);
  for (const [i, l] of leaveTypes.entries()) {
    await upsert("leave_types", "code", { code: l.id, name: l.name, quota_days: l.quotaDays, deducts_balance: l.deductsBalance, unpaid: l.unpaid, attachment_after_days: l.attachmentAfterDays, sort: i }, false);
  }
  log("Master data selesai.");
}

const samplesDir = fileURLToPath(new URL("../../web/public/samples/", import.meta.url));

/** Setiap lampiran demo jadi file tersendiri (seperti upload sungguhan), memakai gambar contoh di web/public/samples. */
async function uploadSample(url: string, title: string, folder: string, uploadedBy: string | undefined, salt?: string): Promise<string> {
  const sample = url.split("/").pop() ?? "file";
  const type = sample.endsWith(".pdf") ? "application/pdf" : "image/png";
  const name = title.replace(/\.(jpe?g|png|pdf)$/i, "") + (sample.endsWith(".pdf") ? ".pdf" : ".png");
  const form = new FormData();
  form.append("title", title);
  form.append("folder", folder);
  // Byte tambahan di akhir file (gambar tetap tampil normal) supaya sidik jari SHA-256 tiap file berbeda,
  // kecuali file yang memang dibuat kembar untuk contoh deteksi struk ganda (hash sama di data dummy).
  const bytes = Buffer.concat([await readFile(samplesDir + sample), Buffer.from(`\n${salt ?? crypto.randomUUID()}`)]);
  form.append("file", new Blob([bytes], { type }), name);
  const res = await fetch(`${BASE_URL}/files`, { method: "POST", headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` }, body: form });
  if (!res.ok) throw new Error(`Upload ${name} gagal: ${res.status} ${await res.text()}`);
  const id = ((await res.json()) as { data: Row }).data.id;
  // Catat pengunggah asli (pegawai / Finance), supaya hak akses file sama seperti data sungguhan.
  if (uploadedBy) await api("PATCH", `/files/${id}`, { uploaded_by: uploadedBy });
  return id;
}

const roleOf: Record<string, string> = { stakeholder: ROLE.stakeholder, hr: ROLE.hr, finance: ROLE.finance, employee: ROLE.employee, external: ROLE.external };

export async function seedDemo(): Promise<void> {
  const teamId = new Map<string, string>();
  for (const t of teams) teamId.set(t.id, await upsert("teams", "name", { name: t.name }, false));
  const catId = new Map<string, string>();
  for (const c of reimbursementCategories) catId.set(c.id, await upsert("reimbursement_categories", "code", { code: c.id }, false));

  // Akun demo: password sama untuk semua, hanya untuk lokal.
  const userId = new Map<string, string>();
  for (const u of users) {
    const [first, ...rest] = u.name.split(" ");
    userId.set(u.id, await upsert("directus_users", "email", {
      email: u.email, password: "demo12345", first_name: first, last_name: rest.join(" "), role: roleOf[u.role], status: "active",
      employee_code: u.employeeCode, team: teamId.get(u.teamId), position: u.position, join_date: u.joinDate,
      external_company: u.external?.company ?? null, access_until: u.external?.accessUntil ?? null,
    }));
  }
  for (const u of users) {
    if (u.external) await api("PATCH", `/users/${userId.get(u.id)}`, { sponsor: userId.get(u.external.sponsorId) });
    const b = u.bankAccount;
    if (!b) continue;
    await upsert("bank_accounts", "owner", {
      owner: userId.get(u.id), bank_name: b.bankName, account_number: b.accountNumber, account_last4: b.accountNumber.slice(-4),
      account_holder: b.accountHolder, verified: b.verified, verified_by: b.verifiedBy ? userId.get(b.verifiedBy) : null,
      verified_at: b.verified ? b.updatedAt : null,
    });
  }

  for (const r of reimbursements) {
    const found = await api<Row[]>("GET", `/items/reimbursements?filter[number][_eq]=${r.number}&fields=id&limit=1`);
    if (found[0]) continue;
    const owner = users.find((u) => u.id === r.userId);
    let paymentId: string | null = null;
    if (r.payment) {
      const proofs = await Promise.all(r.payment.proofFiles.map((f) => uploadSample(f.url ?? "/samples/transfer-proof.png", f.name, FOLDER.paymentProofs, userId.get(r.payment?.byUserId ?? ""))));
      paymentId = (await api<Row>("POST", "/items/reimbursement_payments", {
        date: r.payment.date, method: r.payment.method, reference: r.payment.reference, paid_by: userId.get(r.payment.byUserId),
        proof_files: proofs.map((id) => ({ directus_files_id: id })),
      })).id;
    }
    const items = [];
    for (const [i, it] of r.items.entries()) {
      const files = await Promise.all(it.files.map((f) => uploadSample(f.url ?? "/samples/receipt-general.png", f.name, FOLDER.receipts, userId.get(r.userId), f.hash)));
      items.push({
        sort: i, date: it.date, description: it.description, category: catId.get(it.categoryId), project_code: it.projectCode,
        amount_usd_cents: it.amountUsdCents, amount: it.amount, declined_note: it.declined?.note ?? null,
        declined_by: it.declined ? userId.get(it.declined.byUserId) : null, files: files.map((id) => ({ directus_files_id: id })),
      });
    }
    const claim = await api<Row>("POST", "/items/reimbursements", {
      number: r.number, claimant: userId.get(r.userId), title: r.title, submitted_at: r.submittedAt, status: r.status,
      sponsor: owner?.external ? userId.get(owner.external.sponsorId) : null, payment: paymentId, paid_at: r.paidAt,
      paid_to_bank_name: r.payment?.toAccount?.bankName ?? null, paid_to_account_number: r.payment?.toAccount?.accountNumber ?? null, paid_to_account_last4: r.payment?.toAccount?.accountNumber.slice(-4) ?? null,
      paid_to_account_holder: r.payment?.toAccount?.accountHolder ?? null, items,
    });
    if (r.logs.length > 0) {
      await api("POST", "/items/approval_logs", r.logs.map((l) => ({
        subject_collection: "reimbursements", subject_id: claim.id, subject_user: userId.get(r.userId),
        subject_sponsor: owner?.external ? userId.get(owner.external.sponsorId) : null,
        from_status: l.from, to_status: l.to, note: l.note ?? null, actor: userId.get(l.byUserId), date_created: l.at,
      })));
    }
  }
  log(`Demo selesai: ${users.length} akun (password: demo12345), ${reimbursements.length} reimburse.`);
}

if (isMain(import.meta.url)) {
  await waitForDirectus();
  await seedMaster();
  if (process.argv.includes("--demo")) await seedDemo();
}
