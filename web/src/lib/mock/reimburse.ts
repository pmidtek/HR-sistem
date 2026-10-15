import type { ApprovalLog, Reimbursement, ReimbursementCategory, ReimbursementItem } from "../types";

/** Kategori sesuai form reimburse perusahaan. Bisa diubah di Pengaturan → Kategori reimburse. */
export const reimbursementCategories: ReimbursementCategory[] = [
  "Internet", "Electricity", "Telephone", "Transportation", "Stamp & Postage", "Stationery", "Printing & Photocopy",
  "Legal Fees", "License Fees", "Office Supplies", "Household Expense", "Meals Expenses", "Software", "Subscriptions",
  "Work Clothing", "Tools", "Fixed Asset", "Office Rent", "Tax Expenses", "Donation", "Business Trip", "Accommodation",
  "Marketing Expense", "Entertain", "Promotion", "Admin Bank",
].map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-"), name }));

const log = (at: string, byUserId: string, from: string | null, to: string, note?: string): ApprovalLog => ({ at, byUserId, from, to, note });

let n = 0;
/** [tanggal, keterangan, kategori, kode, usd (sen) | null, rupiah, bukti, alasan ditolak?] */
type Row = [string, string, string, string | null, number | null, number, string[], string?];
const items = (rows: Row[]): ReimbursementItem[] =>
  rows.map(([date, description, categoryId, projectCode, amountUsdCents, amount, files, declined]) => ({
    id: `rbi${++n}`, date, description, categoryId, projectCode, amountUsdCents, amount, files,
    declined: declined ? { note: declined, byUserId: "u3" } : null,
  }));

// Alur lengkap: diajukan → Finance → Stakeholder → disetujui → dibayar.
const full = (owner: string, day: string, paid?: string) => [
  log(`${day}T18:00:00+07:00`, owner, null, "pending_finance"),
  log(`${day}T20:00:00+07:00`, "u3", "pending_finance", "pending_stakeholder"),
  log(`${day}T21:00:00+07:00`, "u1", "pending_stakeholder", "approved"),
  ...(paid ? [log(`${paid}T10:00:00+07:00`, "u3", "approved", "paid")] : []),
];

export const reimbursements: Reimbursement[] = [
  {
    id: "rb1", number: "RB-2610-001", userId: "u4", title: "Operasional server Oktober", submittedAt: "2026-10-06",
    items: items([
      ["2026-10-06", "Taksi ke data center", "transportation", "PR260003", null, 120_000, ["taksi.jpg"]],
      ["2026-10-02", "AWS Lightsail staging", "software", "PR260003", 1_200, 19_850, ["aws-invoice.pdf"]],
    ]),
    status: "pending_finance", paidAt: null, payment: null, logs: [log("2026-10-06T19:00:00+07:00", "u4", null, "pending_finance")],
  },
  {
    id: "rb2", number: "RB-2610-002", userId: "u9", title: "Demo produk klien Maju Bersama", submittedAt: "2026-10-04",
    items: items([
      ["2026-10-03", "Makan siang demo produk (5 orang)", "meals-expenses", "OP260012", null, 420_000, ["nota-1.jpg", "nota-2.jpg"]],
      ["2026-10-03", "Grab PP kantor klien", "transportation", "OP260012", null, 136_000, ["grab-1.jpg", "grab-2.jpg"]],
      ["2026-10-03", "Rokok untuk tamu", "entertain", "OP260012", null, 85_000, ["struk.jpg"], "Rokok tidak termasuk biaya entertain yang diganti."],
    ]),
    status: "pending_stakeholder", paidAt: null, payment: null,
    logs: [log("2026-10-04T09:00:00+07:00", "u9", null, "pending_finance"), log("2026-10-05T10:00:00+07:00", "u3", "pending_finance", "pending_stakeholder", "1 baris ditolak.")],
  },
  {
    id: "rb3", number: "RB-2609-006", userId: "u7", title: "Parkir dan tol rapat cabang", submittedAt: "2026-09-28",
    items: items([["2026-09-28", "Parkir dan tol", "transportation", null, null, 75_000, ["struk.jpg"]]]),
    status: "revision", paidAt: null, payment: null,
    logs: [log("2026-09-28T18:00:00+07:00", "u7", null, "pending_finance"), log("2026-09-29T10:00:00+07:00", "u3", "pending_finance", "revision", "Foto struk tol buram, mohon upload ulang.")],
  },
  {
    id: "rb4", number: "RB-2609-005", userId: "u5", title: "Perjalanan IFT 8–11 Sep", submittedAt: "2026-09-12",
    items: items([
      ["2026-09-08", "Tiket Whoosh pergi", "transportation", "OTHERS", null, 300_000, ["whoosh-pergi.pdf"]],
      ["2026-09-08", "Grab dari Halim ke IFT", "transportation", "OTHERS", null, 91_500, ["grab-1.jpg"]],
      ["2026-09-08", "Grab dari IFT ke kos", "transportation", "OTHERS", null, 141_000, ["grab-2.jpg"]],
      ["2026-09-09", "Tiket Whoosh pulang", "transportation", "OTHERS", null, 325_000, ["whoosh-pulang.pdf"]],
      ["2026-09-11", "Tiket Whoosh pergi", "transportation", "OTHERS", null, 300_000, ["whoosh-pergi-2.pdf"]],
      ["2026-09-11", "Grab dari Halim ke IFT", "transportation", "OTHERS", null, 165_000, ["grab-3.jpg"]],
      ["2026-09-11", "Grab dari IFT ke KCIC Halim", "transportation", "OTHERS", null, 72_500, ["grab-4.jpg"]],
      ["2026-09-08", "Claude", "subscriptions", null, 2_200, 401_944, ["claude-receipt.pdf", "mutasi-kartu.jpg"]],
    ]),
    status: "approved", paidAt: null, payment: null, logs: full("u5", "2026-09-12"),
  },
  {
    id: "rb5", number: "RB-2609-004", userId: "u4", title: "Tools monitoring", submittedAt: "2026-09-20",
    items: items([["2026-09-20", "Langganan tools monitoring 1 bulan", "subscriptions", "PR260003", 2_100, 350_000, ["invoice.pdf"]]]),
    status: "approved", paidAt: null, payment: null, logs: full("u4", "2026-09-20"),
  },
  {
    id: "rb6", number: "RB-2609-003", userId: "u8", title: "Perlengkapan meeting room", submittedAt: "2026-09-10",
    items: items([
      ["2026-09-10", "Kabel HDMI 5m", "tools", "INTERNAL", null, 175_000, ["toko.jpg", "garansi.pdf"]],
      ["2026-09-10", "Adaptor USB-C", "tools", "INTERNAL", null, 100_000, ["toko.jpg"]],
    ]),
    status: "approved", paidAt: null, payment: null, logs: full("u8", "2026-09-10"),
  },
  {
    id: "rb7", number: "RB-2609-002", userId: "u6", title: "Workshop klien Bandung", submittedAt: "2026-09-16",
    items: items([
      ["2026-09-04", "Kereta Jakarta–Bandung PP", "business-trip", "PR260005", null, 680_000, ["tiket-pergi.pdf", "tiket-pulang.pdf"]],
      ["2026-09-15", "Hotel 1 malam", "accommodation", "PR260005", null, 1_250_000, ["hotel.pdf", "kwitansi.jpg"]],
    ]),
    status: "paid", paidAt: "2026-09-25", payment: { date: "2026-09-25", method: "payroll", reference: "Payroll Sep 2026", byUserId: "u3" }, logs: full("u6", "2026-09-16", "2026-09-25"),
  },
  {
    id: "rb8", number: "RB-2608-002", userId: "u4", title: "Domain & SSL", submittedAt: "2026-08-05",
    items: items([
      ["2026-08-05", "Domain .co.id 1 tahun", "license-fees", "PR260003", null, 350_000, ["invoice-domain.pdf"]],
      ["2026-08-05", "SSL wildcard 1 tahun", "software", "PR260003", 4_600, 750_000, ["invoice-ssl.pdf"]],
    ]),
    status: "paid", paidAt: "2026-08-25", payment: { date: "2026-08-25", method: "transfer", reference: "TRF-0825-11", byUserId: "u3" }, logs: full("u4", "2026-08-05", "2026-08-25"),
  },
  {
    id: "rb9", number: "RB-2608-001", userId: "u5", title: "Jamuan klien Agustus", submittedAt: "2026-08-21",
    items: items([["2026-08-21", "Jamuan klien Tracking Armada", "entertain", "OP260015", null, 515_000, ["nota.jpg"]]]),
    status: "paid", paidAt: "2026-08-25", payment: { date: "2026-08-25", method: "transfer", reference: "TRF-0825-12", byUserId: "u3" }, logs: full("u5", "2026-08-21", "2026-08-25"),
  },
  {
    id: "rb10", number: "RB-2607-001", userId: "u9", title: "Kunjungan klien Surabaya", submittedAt: "2026-07-19",
    items: items([
      ["2026-07-18", "Hotel kunjungan klien", "accommodation", "OP260012", null, 950_000, ["hotel.pdf"]],
      ["2026-07-18", "Bensin dan tol", "transportation", "OP260012", null, 230_000, ["spbu.jpg", "tol.jpg"]],
    ]),
    status: "paid", paidAt: "2026-07-25", payment: { date: "2026-07-25", method: "transfer", reference: "TRF-0725-04", byUserId: "u3" }, logs: full("u9", "2026-07-19", "2026-07-25"),
  },
  {
    id: "rb11", number: "RB-2606-002", userId: "u6", title: "Cetak materi workshop", submittedAt: "2026-06-11",
    items: items([["2026-06-11", "Cetak materi workshop 40 set", "printing-and-photocopy", "PR260005", null, 350_000, ["percetakan.jpg"]]]),
    status: "rejected", paidAt: null, payment: null,
    logs: [log("2026-06-11T18:00:00+07:00", "u6", null, "pending_finance"), log("2026-06-12T10:00:00+07:00", "u3", "pending_finance", "rejected", "Sudah ditanggung klien sesuai kontrak.")],
  },
  {
    id: "rb12", number: "RB-2606-001", userId: "u8", title: "Konsumsi lembur tim", submittedAt: "2026-06-24",
    items: items([["2026-06-24", "Konsumsi lembur tim (6 orang)", "meals-expenses", "INTERNAL", null, 180_000, ["nota.jpg"]]]),
    status: "paid", paidAt: "2026-06-25", payment: { date: "2026-06-25", method: "transfer", reference: "TRF-0625-02", byUserId: "u3" }, logs: full("u8", "2026-06-24", "2026-06-25"),
  },
  {
    id: "rb13", number: "RB-2605-001", userId: "u7", title: "Internet & pulsa kerja remote", submittedAt: "2026-05-27",
    items: items([
      ["2026-05-20", "Paket internet rumah Mei", "internet", null, null, 350_000, ["tagihan.pdf"]],
      ["2026-05-20", "Pulsa telepon klien", "telephone", null, null, 100_000, ["pulsa.jpg"]],
    ]),
    status: "paid", paidAt: "2026-06-25", payment: { date: "2026-06-25", method: "payroll", reference: "Payroll Jun 2026", byUserId: "u3" }, logs: full("u7", "2026-05-27", "2026-06-25"),
  },
];
