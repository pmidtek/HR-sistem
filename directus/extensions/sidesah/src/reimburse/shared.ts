/** Bagian bersama endpoint reimburse: hak aksi, validasi baris, teks notifikasi. */
import type { Knex } from "knex";
import { allowedReimburseActions, type ReimburseAction } from "../../../../../web/src/lib/calc/approval";
import { claimTotal, estimatedPayDate, validateReimburseRow, type ReimburseRowInput } from "../../../../../web/src/lib/calc/reimburse";
import { formatDayShort, formatRupiah } from "../../../../../web/src/lib/format";
import type { Reimbursement } from "../../../../../web/src/lib/types";
import { bad, forbidden, int, notFound, str, strArray, today, type Actor } from "../lib/context";
import { holidaySet, loadClaim, loadUser, reimburseSettings } from "./repo";

export async function claimOr404(db: Knex, id: string) {
  const c = await loadClaim(db, id);
  if (!c) throw notFound("Reimbursement not found.");
  return c;
}

export function actionsFor(actor: Actor, claim: Reimbursement & { sponsorId: string | null }): ReimburseAction[] {
  return allowedReimburseActions(actor, claim.userId, claim.status, claim.sponsorId);
}

/** Status awal: external menunggu konfirmasi PIC dulu, pegawai langsung ke Finance. */
export async function firstStatus(db: Knex, userId: string): Promise<{ status: "pending_sponsor" | "pending_finance"; sponsor: string | null }> {
  const u = await loadUser(db, userId);
  if (u?.role !== "external") return { status: "pending_finance", sponsor: null };
  if (!u.external?.sponsorId) throw bad("Your account has no PIC yet. Ask HR to assign one.");
  if (u.external.accessUntil && u.external.accessUntil < today()) throw bad("Your access period has ended. Contact your PIC.");
  return { status: "pending_sponsor", sponsor: u.external.sponsorId };
}

export type RowInput = ReimburseRowInput & { fileIds: string[] };

/**
 * Baca & validasi baris dari body request. File harus sudah di-upload (POST /files) oleh pengaju sendiri,
 * kategori harus ada, dan aturan baris sama dengan frontend (umur struk, nominal, minimal 1 bukti).
 */
export async function parseRows(db: Knex, body: unknown, ownerId: string): Promise<RowInput[]> {
  const raw = (body as { items?: unknown }).items;
  if (!Array.isArray(raw) || raw.length === 0) throw bad("Fill in at least 1 row.");
  if (raw.length > 200) throw bad("Too many rows (max 200).");
  const settings = await reimburseSettings(db);
  const now = today();
  const rows: RowInput[] = raw.map((r: Record<string, unknown>, i) => {
    const n = `Row ${i + 1}`;
    const fileIds = strArray(r.fileIds ?? [], `${n}: files`);
    const code = str(r.projectCode, `${n}: code`, { optional: true, max: 40 }).trim().toUpperCase().replace(/\s+/g, "");
    return {
      date: str(r.date, `${n}: date`, { max: 10 }),
      description: str(r.description, `${n}: description`, { max: 2000 }),
      categoryId: str(r.categoryId, `${n}: category`),
      projectCode: code || null,
      amountUsdCents: int(r.amountUsdCents, `${n}: USD`, { nullable: true }),
      amount: int(r.amount, `${n}: amount`) ?? 0,
      files: fileIds.map((id) => ({ name: id, url: id })),
      fileIds,
    };
  });
  rows.forEach((r, i) => {
    const errs = validateReimburseRow(r, now, settings.maxReceiptAgeMonths);
    const first = Object.values(errs)[0];
    if (first) throw bad(`Row ${i + 1}: ${first}`);
  });
  const catIds = [...new Set(rows.map((r) => r.categoryId))];
  const cats = await db("reimbursement_categories").whereIn("id", catIds).select("id");
  if (cats.length !== catIds.length) throw bad("Unknown category.");
  const fileIds = [...new Set(rows.flatMap((r) => r.fileIds))];
  const files = await db<{ id: string; uploaded_by: string | null }>("directus_files").whereIn("id", fileIds).select("id", "uploaded_by");
  if (files.length !== fileIds.length) throw bad("A receipt file was not found. Upload it again.");
  if (files.some((f) => f.uploaded_by !== ownerId)) throw forbidden("You can only attach files you uploaded yourself.");
  return rows;
}

export const itemPayload = (rows: RowInput[]) =>
  rows.map((r, i) => ({
    sort: i, date: r.date, description: r.description.trim(), category: r.categoryId, project_code: r.projectCode,
    amount_usd_cents: r.amountUsdCents, amount: r.amount, files: r.fileIds.map((id) => ({ directus_files_id: id })),
  }));

export type NoticeAction = "confirm" | "forward" | "approve" | "revision" | "reject";

/** Notifikasi pribadi untuk pemilik: apa yang terjadi, oleh siapa, alasan, baris yang ditolak, langkah berikutnya. */
export async function ownerNotice(db: Knex, r: Reimbursement, action: NoticeAction, by: string, note?: string): Promise<{ title: string; body: string }> {
  const declined = r.items.filter((i) => i.declined);
  const declinedText = declined.length === 0 ? "" : ` ${declined.length} item(s) declined: ${declined.map((i) => `${i.description} (${formatRupiah(i.amount)}): ${i.declined?.note}`).join("; ")}.`;
  const total = formatRupiah(claimTotal(r));
  switch (action) {
    case "reject":
      return { title: "Your reimbursement was rejected", body: `${r.number} was rejected by ${by}. Reason: ${note ?? "-"}` };
    case "revision":
      return { title: "Your reimbursement needs revision", body: `${by} asked you to fix ${r.number}. Reason: ${note ?? "-"} Open the claim and click "Fix & resubmit".` };
    case "confirm":
      return {
        title: declined.length > 0 ? "Your PIC confirmed part of your reimbursement" : "Your PIC confirmed your reimbursement",
        body: `${r.number} was confirmed by ${by} and is now with Finance (${total}).${declinedText}`,
      };
    case "forward":
      return {
        title: declined.length > 0 ? "Some items in your reimbursement were declined" : "Your reimbursement passed Finance review",
        body: `${r.number} was reviewed by ${by} and forwarded for Stakeholder approval (${total}).${declinedText}`,
      };
    case "approve": {
      const pay = formatDayShort(estimatedPayDate(r.submittedAt, await reimburseSettings(db), await holidaySet(db)));
      return {
        title: declined.length > 0 ? "Your reimbursement was approved (partially)" : "Your reimbursement was approved",
        body: `${r.number} was approved by ${by}: ${total} will be paid, estimated ${pay}.${declinedText}`,
      };
    }
  }
}
