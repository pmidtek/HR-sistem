import type { ApprovalLog, FileRef, Reimbursement, ReimbursementCategory, ReimbursementItem } from "../types";

/** Kategori sesuai form reimburse perusahaan. Bisa diubah di Pengaturan → Kategori reimburse. */
export const reimbursementCategories: ReimbursementCategory[] = [
  "Internet", "Electricity", "Telephone", "Transportation", "Stamp & Postage", "Stationery", "Printing & Photocopy",
  "Legal Fees", "License Fees", "Office Supplies", "Household Expense", "Meals Expenses", "Software", "Subscriptions",
  "Work Clothing", "Tools", "Fixed Asset", "Office Rent", "Tax Expenses", "Donation", "Business Trip", "Accommodation",
  "Marketing Expense", "Entertain", "Promotion", "Admin Bank",
].map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-"), name }));

/** File contoh di public/samples supaya bukti di data demo bisa dibuka. */
function sample(name: string, categoryId = ""): FileRef {
  if (name.endsWith(".pdf")) return { name, url: "/samples/invoice.pdf" };
  if (categoryId === "transportation" || categoryId === "business-trip") return { name, url: "/samples/receipt-transport.png" };
  if (categoryId === "meals-expenses" || categoryId === "entertain") return { name, url: "/samples/receipt-meal.png" };
  return { name, url: "/samples/receipt-general.png" };
}
const proof = (name: string): FileRef[] => [{ name, url: "/samples/transfer-proof.png" }];

const log = (at: string, byUserId: string, from: string | null, to: string, note?: string): ApprovalLog => ({ at, byUserId, from, to, note });

let n = 0;
/** [tanggal, keterangan, kategori, kode, usd (sen) | null, rupiah, bukti, alasan ditolak?] */
type Row = [string, string, string, string | null, number | null, number, string[], string?];
const items = (rows: Row[]): ReimbursementItem[] =>
  rows.map(([date, description, categoryId, projectCode, amountUsdCents, amount, files, declined]) => ({
    id: `rbi${++n}`, date, description, categoryId, projectCode, amountUsdCents, amount, files: files.map((f) => sample(f, categoryId)),
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
    id: "rb1", number: "RB-2610-001", userId: "u4", title: "Server operations October", submittedAt: "2026-10-06",
    items: items([
      ["2026-10-06", "Taxi to data center", "transportation", "PR260003", null, 120_000, ["taksi.jpg"]],
      ["2026-10-02", "AWS Lightsail staging", "software", "PR260003", 1_200, 19_850, ["aws-invoice.pdf"]],
    ]),
    status: "pending_finance", paidAt: null, payment: null, logs: [log("2026-10-06T19:00:00+07:00", "u4", null, "pending_finance")],
  },
  {
    id: "rb14", number: "RB-2610-003", userId: "u5", title: "Client meeting in Bekasi", submittedAt: "2026-10-05",
    items: items([
      ["2026-10-05", "Grab to client office", "transportation", "OP260015", null, 98_000, ["grab.jpg"]],
      ["2026-10-05", "Lunch with client (3 people)", "meals-expenses", "OP260015", null, 285_000, ["receipt.jpg"]],
    ]),
    status: "approved", paidAt: null, payment: null, logs: full("u5", "2026-10-05"),
  },
  {
    id: "rb2", number: "RB-2610-002", userId: "u9", title: "Product demo at Maju Bersama", submittedAt: "2026-10-04",
    items: items([
      ["2026-10-03", "Lunch during product demo (5 people)", "meals-expenses", "OP260012", null, 420_000, ["nota-1.jpg", "nota-2.jpg"]],
      ["2026-10-03", "Grab round trip to client office", "transportation", "OP260012", null, 136_000, ["grab-1.jpg", "grab-2.jpg"]],
      ["2026-10-03", "Cigarettes for guests", "entertain", "OP260012", null, 85_000, ["struk.jpg"], "Cigarettes are not a reimbursable entertainment expense."],
    ]),
    status: "pending_stakeholder", paidAt: null, payment: null,
    logs: [log("2026-10-04T09:00:00+07:00", "u9", null, "pending_finance"), log("2026-10-05T10:00:00+07:00", "u3", "pending_finance", "pending_stakeholder", "1 item(s) declined.")],
  },
  {
    id: "rb3", number: "RB-2609-006", userId: "u7", title: "Parking & toll for branch meeting", submittedAt: "2026-09-28",
    items: items([["2026-09-28", "Parking and toll", "transportation", null, null, 75_000, ["struk.jpg"]]]),
    status: "revision", paidAt: null, payment: null,
    logs: [log("2026-09-28T18:00:00+07:00", "u7", null, "pending_finance"), log("2026-09-29T10:00:00+07:00", "u3", "pending_finance", "revision", "The toll receipt photo is blurry, please re-upload.")],
  },
  {
    id: "rb4", number: "RB-2609-005", userId: "u5", title: "IFT trip 8–11 Sep", submittedAt: "2026-09-12",
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
    items: items([["2026-09-20", "Monitoring tool subscription (1 month)", "subscriptions", "PR260003", 2_100, 350_000, ["invoice.pdf"]]]),
    status: "approved", paidAt: null, payment: null, logs: full("u4", "2026-09-20"),
  },
  {
    id: "rb6", number: "RB-2609-003", userId: "u8", title: "Meeting room supplies", submittedAt: "2026-09-10",
    items: items([
      ["2026-09-10", "HDMI cable 5m", "tools", "INTERNAL", null, 175_000, ["toko.jpg", "garansi.pdf"]],
      ["2026-09-10", "USB-C adapter", "tools", "INTERNAL", null, 100_000, ["toko.jpg"]],
    ]),
    status: "approved", paidAt: null, payment: null, logs: full("u8", "2026-09-10"),
  },
  {
    id: "rb7", number: "RB-2609-002", userId: "u6", title: "Client workshop in Bandung", submittedAt: "2026-09-16",
    items: items([
      ["2026-09-04", "Train Jakarta–Bandung round trip", "business-trip", "PR260005", null, 680_000, ["tiket-pergi.pdf", "tiket-pulang.pdf"]],
      ["2026-09-15", "Hotel, 1 night", "accommodation", "PR260005", null, 1_250_000, ["hotel.pdf", "kwitansi.jpg"]],
    ]),
    status: "paid", paidAt: "2026-09-25", payment: { date: "2026-09-25", method: "payroll", reference: "Payroll Sep 2026", proofFiles: proof("bukti-transfer-2026-09-25.jpg"), byUserId: "u3" }, logs: full("u6", "2026-09-16", "2026-09-25"),
  },
  {
    id: "rb8", number: "RB-2608-002", userId: "u4", title: "Domain & SSL", submittedAt: "2026-08-05",
    items: items([
      ["2026-08-05", "Domain .co.id, 1 year", "license-fees", "PR260003", null, 350_000, ["invoice-domain.pdf"]],
      ["2026-08-05", "Wildcard SSL, 1 year", "software", "PR260003", 4_600, 750_000, ["invoice-ssl.pdf"]],
    ]),
    status: "paid", paidAt: "2026-08-25", payment: { date: "2026-08-25", method: "transfer", reference: "TRF-0825-11", proofFiles: proof("bukti-transfer-2026-08-25.jpg"), byUserId: "u3" }, logs: full("u4", "2026-08-05", "2026-08-25"),
  },
  {
    id: "rb9", number: "RB-2608-001", userId: "u5", title: "Client dinner August", submittedAt: "2026-08-21",
    items: items([["2026-08-21", "Client dinner, Fleet Tracking project", "entertain", "OP260015", null, 515_000, ["nota.jpg"]]]),
    status: "paid", paidAt: "2026-08-25", payment: { date: "2026-08-25", method: "transfer", reference: "TRF-0825-12", proofFiles: proof("bukti-transfer-2026-08-25.jpg"), byUserId: "u3" }, logs: full("u5", "2026-08-21", "2026-08-25"),
  },
  {
    id: "rb10", number: "RB-2607-001", userId: "u9", title: "Client visit Surabaya", submittedAt: "2026-07-19",
    items: items([
      ["2026-07-18", "Hotel for client visit", "accommodation", "OP260012", null, 950_000, ["hotel.pdf"]],
      ["2026-07-18", "Fuel and toll", "transportation", "OP260012", null, 230_000, ["spbu.jpg", "tol.jpg"]],
    ]),
    status: "paid", paidAt: "2026-07-25", payment: { date: "2026-07-25", method: "transfer", reference: "TRF-0725-04", proofFiles: proof("bukti-transfer-2026-07-25.jpg"), byUserId: "u3" }, logs: full("u9", "2026-07-19", "2026-07-25"),
  },
  {
    id: "rb11", number: "RB-2606-002", userId: "u6", title: "Workshop material printing", submittedAt: "2026-06-11",
    items: items([["2026-06-11", "Workshop material printing, 40 sets", "printing-and-photocopy", "PR260005", null, 350_000, ["percetakan.jpg"]]]),
    status: "rejected", paidAt: null, payment: null,
    logs: [log("2026-06-11T18:00:00+07:00", "u6", null, "pending_finance"), log("2026-06-12T10:00:00+07:00", "u3", "pending_finance", "rejected", "Already covered by the client per contract.")],
  },
  {
    id: "rb12", number: "RB-2606-001", userId: "u8", title: "Team overtime meals", submittedAt: "2026-06-24",
    items: items([["2026-06-24", "Team overtime meals (6 people)", "meals-expenses", "INTERNAL", null, 180_000, ["nota.jpg"]]]),
    status: "paid", paidAt: "2026-06-25", payment: { date: "2026-06-25", method: "transfer", reference: "TRF-0625-02", proofFiles: proof("bukti-transfer-2026-06-25.jpg"), byUserId: "u3" }, logs: full("u8", "2026-06-24", "2026-06-25"),
  },
  {
    id: "rb13", number: "RB-2605-001", userId: "u7", title: "Internet & phone credit for remote work", submittedAt: "2026-05-27",
    items: items([
      ["2026-05-20", "Home internet, May", "internet", null, null, 350_000, ["tagihan.pdf"]],
      ["2026-05-20", "Phone credit for client calls", "telephone", null, null, 100_000, ["pulsa.jpg"]],
    ]),
    status: "paid", paidAt: "2026-06-25", payment: { date: "2026-06-25", method: "payroll", reference: "Payroll Jun 2026", proofFiles: proof("bukti-transfer-2026-06-25.jpg"), byUserId: "u3" }, logs: full("u7", "2026-05-27", "2026-06-25"),
  },
];
