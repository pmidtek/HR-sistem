/** Panggilan endpoint backend untuk semua aksi Reimburse, rekening, pegawai, pengaturan, dan notifikasi. */
import type { ReimburseAction } from "../calc/approval";
import type { ReimburseRowInput } from "../calc/reimburse";
import type { AppSettings } from "../settings-types";
import type { BankAccount, FileRef, Holiday, ReimbursementCategory, ReimbursePayment, Team, User } from "../types";
import { apiGet, apiSend, assetUrl, uploadFile } from "./client";
import { FOLDER } from "./ids";

/** Upload beberapa file sekaligus (paralel). Gagal satu = semua dibatalkan dengan pesan jelas. */
export async function uploadMany(files: File[], kind: "receipt" | "proof"): Promise<FileRef[]> {
  const folder = kind === "receipt" ? FOLDER.receipts : FOLDER.paymentProofs;
  const done = await Promise.all(files.map((f) => uploadFile(f, folder)));
  return done.map((d) => ({ id: d.id, name: d.filename_download, url: assetUrl(d.id) }));
}

/**
 * Link berbagi Google Drive / Dropbox diubah ke link unduhan langsung supaya server mendapat file aslinya,
 * bukan halaman web.
 */
export function directDownloadUrl(raw: string): string {
  const url = raw.trim();
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]+)/);
  if (drive) return `https://drive.google.com/uc?export=download&id=${drive[1]}`;
  if (/dropbox\.com\//.test(url)) return url.replace(/([?&])dl=0/, "$1dl=1").replace(/^(?!.*[?&]dl=1)(.*)$/, (m) => (m.includes("?") ? `${m}&dl=1` : `${m}?dl=1`));
  return url;
}

/** Server mengunduh file dari link lalu menyimpannya seperti upload biasa. */
export async function importFromUrl(url: string, kind: "receipt" | "proof"): Promise<FileRef> {
  if (!/^https?:\/\//i.test(url.trim())) throw new Error("Use a link that starts with http:// or https://");
  const folder = kind === "receipt" ? FOLDER.receipts : FOLDER.paymentProofs;
  const f = await apiSend<{ id: string; filename_download: string }>("POST", "/files/import", { url: directDownloadUrl(url), data: { folder } });
  return { id: f.id, name: f.filename_download, url: assetUrl(f.id) };
}

const fileIds = (files: FileRef[]) => {
  const ids = files.map((f) => f.id).filter((id): id is string => !!id);
  if (ids.length !== files.length) throw new Error("Some receipts are still uploading or failed. Remove them and upload again.");
  return ids;
};

const rowsPayload = (rows: ReimburseRowInput[]) =>
  rows.map((r) => ({ date: r.date, description: r.description, categoryId: r.categoryId, projectCode: r.projectCode, amountUsdCents: r.amountUsdCents, amount: r.amount, fileIds: fileIds(r.files) }));

export const reimburseApi = {
  submit: (title: string, rows: ReimburseRowInput[]) => apiSend<{ id: string; number: string }>("POST", "/sidesah/reimbursements", { title, items: rowsPayload(rows) }),
  resubmit: (id: string, title: string, rows: ReimburseRowInput[]) => apiSend("POST", `/sidesah/reimbursements/${id}/resubmit`, { title, items: rowsPayload(rows) }),
  act: (id: string, action: Exclude<ReimburseAction, "mark_paid" | "resubmit">, note?: string) => apiSend("POST", `/sidesah/reimbursements/${id}/action`, { action, note }),
  decline: (id: string, itemId: string, note: string | null) => apiSend("POST", `/sidesah/reimbursements/${id}/items/${itemId}/decline`, { note }),
  pay: (ids: string[], p: Omit<ReimbursePayment, "byUserId" | "toAccount">) =>
    apiSend("POST", "/sidesah/reimbursements/pay", { ids, date: p.date, method: p.method, reference: p.reference, proofFileIds: fileIds(p.proofFiles) }),
  risk: (id: string) => apiGet<{ code: string; severity: "high" | "medium" | "low"; message: string; itemId?: string }[]>(`/sidesah/reimbursements/${id}/risk`),
};

/** Ambil kurs USD terbaru sekarang (Finance/Stakeholder). */
export const fxApi = {
  refresh: () => apiSend<{ rate: number; source: string; date: string } | null>("POST", "/sidesah/fx/refresh"),
  /** Kurs USD pada tanggal transaksi (akhir pekan → hari kerja sebelumnya). */
  rateOn: (date: string) => apiGet<{ date: string; rate: number; rateDate: string | null; source: string | null }>("/sidesah/fx/rate", { date }),
};

export const accountApi = {
  saveBank: (userId: string, a: Pick<BankAccount, "bankName" | "accountNumber" | "accountHolder">) => apiSend("PUT", `/sidesah/bank-accounts/${userId}`, a),
  verifyBank: (userId: string) => apiSend("POST", `/sidesah/bank-accounts/${userId}/verify`),
  readAll: () => apiSend("POST", "/sidesah/notifications/read-all"),
  readOne: (id: string) => apiSend("PATCH", `/items/notifications/${id}`, { read: true }),
  saveUser: (u: Omit<User, "id" | "employeeCode"> & { id?: string; password?: string }) => {
    const body = { name: u.name, email: u.email, role: u.role, teamId: u.teamId, position: u.position, joinDate: u.joinDate, active: u.active, external: u.external, password: u.password || undefined };
    return u.id ? apiSend("PATCH", `/sidesah/users/${u.id}`, body) : apiSend("POST", "/sidesah/users", body);
  },
};

/** Pengaturan yang sudah dirilis: pembayaran reimburse & data perusahaan. */
export async function saveSettingsApi<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
  if (key === "reimburse") {
    const r = value as AppSettings["reimburse"];
    await apiSend("PATCH", "/items/app_settings", {
      // Mode otomatis: kurs diisi server, jadi tidak ikut dikirim.
      reimburse_usd_rate_auto: r.usdRateAuto, ...(r.usdRateAuto ? {} : { reimburse_usd_rate: r.usdRate }), reimburse_pay_days: r.payDays, reimburse_lead_days: r.leadDays,
      reimburse_max_receipt_age_months: r.maxReceiptAgeMonths, reimburse_require_verified_account: r.requireVerifiedAccount,
    });
    // Baru dinyalakan → langsung ambil kurs terbaru, tidak menunggu jadwal berikutnya.
    if (r.usdRateAuto) await apiSend("POST", "/sidesah/fx/refresh").catch(() => undefined);
  } else if (key === "company") {
    const c = value as AppSettings["company"];
    await apiSend("PATCH", "/items/app_settings", { company_name: c.name, company_address: c.address });
  } else if (key === "work") {
    const w = value as AppSettings["work"];
    await apiSend("PATCH", "/items/app_settings", {
      work_normal_hours_per_day: w.normalHoursPerDay, work_days_per_week: w.workdaysPerWeek, timesheet_backdate_days: w.timesheetBackdateDays, monthly_target_hours: w.monthlyTargetHours,
    });
  } else {
    throw new Error("This setting is not available yet.");
  }
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);
const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Simpan daftar master (kategori, libur, tim) dengan membandingkan daftar lama vs baru.
 * Kategori yang dihapus hanya dinonaktifkan (masih dipakai di klaim lama).
 */
export async function saveMasterApi(key: "reimbursementCategories" | "holidays" | "teams", before: unknown[], after: unknown[]): Promise<void> {
  if (key === "reimbursementCategories") {
    const prev = before as ReimbursementCategory[];
    const next = after as ReimbursementCategory[];
    if (next.some((c) => !c.name.trim())) throw new Error("Every category needs a name.");
    for (const c of next) {
      const old = prev.find((p) => p.id === c.id);
      const data = { name: c.name.trim(), limit_per_item: c.limitPerItem ?? null, active: true };
      if (!isUuid(c.id)) await apiSend("POST", "/items/reimbursement_categories", { ...data, code: `${slug(c.name)}-${Date.now().toString(36)}` });
      else if (!old || old.name !== c.name || (old.limitPerItem ?? null) !== (c.limitPerItem ?? null) || old.active === false) await apiSend("PATCH", `/items/reimbursement_categories/${c.id}`, data);
    }
    for (const p of prev) if (p.active !== false && !next.some((c) => c.id === p.id)) await apiSend("PATCH", `/items/reimbursement_categories/${p.id}`, { active: false });
    return;
  }
  if (key === "holidays") {
    const prev = before as Holiday[];
    const next = after as Holiday[];
    if (next.some((h) => !h.date || !h.name.trim())) throw new Error("Every holiday needs a date and a name.");
    if (new Set(next.map((h) => h.date)).size !== next.length) throw new Error("Two holidays have the same date.");
    const rows = await apiGet<{ id: string; date: string; name: string }[]>("/items/holidays", { limit: -1 });
    const byDate = new Map(rows.map((r) => [r.date.slice(0, 10), r]));
    for (const h of next) {
      const row = byDate.get(h.date);
      if (!row) await apiSend("POST", "/items/holidays", { date: h.date, name: h.name.trim() });
      else if (row.name !== h.name) await apiSend("PATCH", `/items/holidays/${row.id}`, { name: h.name.trim() });
    }
    const gone = prev.filter((p) => !next.some((h) => h.date === p.date)).map((p) => byDate.get(p.date)?.id).filter((id): id is string => !!id);
    if (gone.length) await apiSend("DELETE", "/items/holidays", gone);
    return;
  }
  const prev = before as Team[];
  const next = after as Team[];
  if (next.some((t) => !t.name.trim())) throw new Error("Every team needs a name.");
  for (const [i, t] of next.entries()) {
    const old = prev.find((p) => p.id === t.id);
    if (!isUuid(t.id)) await apiSend("POST", "/items/teams", { name: t.name.trim(), kind: t.kind, sort: i });
    else if (!old || old.name !== t.name || old.kind !== t.kind) await apiSend("PATCH", `/items/teams/${t.id}`, { name: t.name.trim(), kind: t.kind });
  }
  const gone = prev.filter((p) => !next.some((t) => t.id === p.id)).map((p) => p.id);
  if (gone.length) await apiSend("DELETE", "/items/teams", gone);
}
