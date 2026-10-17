/** Reimburse: satu pengajuan (grup) berisi banyak baris, disetujui & dibayar sekaligus. */
import { collection, folder } from "./dsl";

folder("grp_reimburse", "receipt_long", "Reimburse", "Reimburse", 1);

const STATUS = ["pending_sponsor", "pending_finance", "revision", "pending_stakeholder", "approved", "rejected", "paid"];

collection("reimbursement_categories", { icon: "category", group: "grp_reimburse", display: "{{name}}", sort: true }, (c) => {
  c.string("code", { required: true, unique: true, max: 60, width: "half" })
    .string("name", { required: true, width: "half" })
    .integer("limit_per_item", { width: "half", note: "Batas wajar per baris (Rp). Di atasnya ditandai untuk dicek. Kosong = tanpa batas" })
    .boolean("active", { default: true, width: "half" });
});

/** Satu kali pembayaran (bisa untuk beberapa pengajuan sekaligus) + bukti transfer. */
collection("reimbursement_payments", { icon: "payments", group: "grp_reimburse", display: "{{date}} {{reference}}" }, (c) => {
  c.date("date", { required: true, width: "half" })
    .choice("method", ["transfer", "payroll"], { required: true, default: "transfer", width: "half" })
    .string("reference", { width: "half" })
    .m2o("paid_by", "directus_users", { width: "half" })
    .m2m("proof_files", "directus_files", "reimbursement_payment_files", { note: "Bukti pembayaran, wajib minimal 1", reverse: "reimbursement_payment_links" })
    .stamps(["created"]);
});

collection("reimbursements", { icon: "receipt_long", group: "grp_reimburse", display: "{{number}} {{title}}" }, (c) => {
  c.string("number", { required: true, unique: true, max: 20, readonly: true, width: "half", note: "RB-YYMM-NNN" })
    .m2o("claimant", "directus_users", { required: true, width: "half" })
    .string("title", { required: true })
    .date("submitted_at", { required: true, width: "half" })
    .choice("status", STATUS, { required: true, default: "pending_finance", readonly: true, indexed: true, width: "half", note: "Hanya berubah lewat endpoint /sidesah/reimbursements" })
    .m2o("sponsor", "directus_users", { readonly: true, width: "half", note: "PIC internal saat diajukan (khusus external)" })
    .m2o("payment", "reimbursement_payments", { readonly: true, width: "half", reverse: "claims" })
    .date("paid_at", { readonly: true, width: "half" })
    // Rekening tujuan saat dibayar, dicatat permanen.
    .string("paid_to_bank_name", { readonly: true, width: "half" })
    .string("paid_to_account_number", { readonly: true, max: 30, width: "half" })
    .string("paid_to_account_last4", { readonly: true, max: 4, width: "half" })
    .string("paid_to_account_holder", { readonly: true, width: "half" })
    .stamps(["created", "updated"]);
});

collection("reimbursement_items", { icon: "list", group: "grp_reimburse", display: "{{description}}", sort: true }, (c) => {
  c.m2o("claim", "reimbursements", { required: true, onDelete: "CASCADE", reverse: "items" })
    .date("date", { required: true, width: "half" })
    .m2o("category", "reimbursement_categories", { required: true, width: "half", display: "{{name}}" })
    .text("description", { required: true })
    .string("project_code", { max: 40, width: "half", note: "Kode project bebas, OTHERS, atau kosong" })
    .integer("amount_usd_cents", { width: "half", note: "Biaya asli USD dalam sen ($22.00 = 2200); kosong jika Rupiah" })
    .integer("amount", { required: true, width: "half", note: "Rupiah yang diganti" })
    .text("declined_note", { readonly: true, note: "Diisi jika baris ini ditolak peninjau" })
    .m2o("declined_by", "directus_users", { readonly: true, width: "half" })
    .m2m("files", "directus_files", "reimbursement_item_files", { note: "Struk/invoice, minimal 1", reverse: "reimbursement_item_links" });
});
