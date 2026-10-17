/**
 * Endpoint reimburse (pengganti web/src/store/actions-reimburse.ts).
 * Status HANYA berubah di sini; setiap transisi dicatat ke approval_logs.
 *
 *   POST /sidesah/reimbursements                     ajukan  { title, items: [{date, description, categoryId, projectCode, amountUsdCents, amount, fileIds}] }
 *   POST /sidesah/reimbursements/:id/resubmit        perbaiki & kirim ulang (body sama)
 *   POST /sidesah/reimbursements/:id/action          { action: confirm|forward|revision|reject|approve, note? }
 *   POST /sidesah/reimbursements/:id/items/:itemId/decline   { note }  (note null = pulihkan baris)
 *   POST /sidesah/reimbursements/pay                 { ids, date, method: transfer|payroll, reference, proofFileIds }
 *   GET  /sidesah/reimbursements/:id/risk            tanda risiko (anti-fraud) untuk peninjau
 */
import type { Router } from "express";
import { canReviewReimburseItems, reimburseStatusLabel, reimburseTransitions, type ReimburseAction } from "../../../../../web/src/lib/calc/approval";
import { activeItems, claimTotal, nextClaimNumber } from "../../../../../web/src/lib/calc/reimburse";
import { riskFlags } from "../../../../../web/src/lib/calc/reimburse-risk";
import { addMonths } from "../../../../../web/src/lib/calc/dates";
import { formatRupiah } from "../../../../../web/src/lib/format";
import { bad, forbidden, idsByRole, inTx, items, logTransition, nameOf, notify, route, str, strArray, today, type Ctx } from "../lib/context";
import { categories, existingNumbers, holidaySet, loadRecentClaims, loadUser, reimburseSettings, bankAccountOf } from "./repo";
import { actionsFor, claimOr404, firstStatus, itemPayload, ownerNotice, parseRows, type NoticeAction } from "./shared";

const REVIEW_ACTIONS = ["confirm", "forward", "revision", "reject", "approve"] as const;
type ReviewAction = (typeof REVIEW_ACTIONS)[number];
const href = (id: string) => `/reimbursements?claim=${id}`;

export function reimburseRoutes(router: Router, ctx: Ctx) {
  const db = ctx.database;

  router.post("/reimbursements", route(ctx, async (req, actor) => {
    const title = str(req.body?.title, "Title", { optional: true, max: 200 }).trim();
    const rows = await parseRows(db, req.body, actor.id);
    const { status, sponsor } = await firstStatus(db, actor.id);
    const now = today();
    const prefix = `RB-${now.slice(2, 4)}${now.slice(5, 7)}-`;
    // Nomor unik per bulan; ulangi kalau bentrok dengan pengajuan lain di detik yang sama.
    for (let attempt = 0; ; attempt++) {
      const number = nextClaimNumber(await existingNumbers(db, prefix), now);
      try {
        return await inTx(ctx, async (tx) => {
          const id = (await items(ctx, tx, "reimbursements").createOne({
            number, claimant: actor.id, title: title || `Reimbursement (${rows.length} items)`, submitted_at: now, status, sponsor,
            items: itemPayload(rows),
          })) as string;
          await logTransition(ctx, tx, { collection: "reimbursements", id, owner: actor.id, sponsor, from: null, to: status, actor: actor.id });
          const total = formatRupiah(rows.reduce((t, r) => t + r.amount, 0));
          if (status === "pending_sponsor") {
            await notify(ctx, tx, [sponsor ?? ""], "Please confirm a reimbursement",
              `${actor.name} (external) submitted ${number} (${rows.length} items, ${total}). You are the PIC: confirm the expenses are real before Finance reviews them.`, href(id));
          } else {
            await notify(ctx, tx, (await idsByRole(db, "finance")).filter((x) => x !== actor.id), "New reimbursement", `${actor.name} submitted ${number} (${rows.length} items, ${total}).`, "/approvals");
          }
          return { id, number, status };
        });
      } catch (e) {
        if (attempt < 3 && String(e).includes("unique")) continue;
        throw e;
      }
    }
  }));

  router.post("/reimbursements/pay", route(ctx, async (req, actor) => {
    const ids = strArray(req.body?.ids, "ids");
    const date = str(req.body?.date, "Payment date", { max: 10 });
    const method = req.body?.method === "payroll" ? "payroll" : "transfer";
    const reference = str(req.body?.reference, "Reference", { optional: true, max: 200 });
    const proofIds = strArray(req.body?.proofFileIds ?? [], "Payment proof");
    if (ids.length === 0) throw bad("Select at least 1 claim.");
    if (proofIds.length === 0) throw bad("Upload the payment proof first.");
    const proofs = await db("directus_files").whereIn("id", proofIds).select("id");
    if (proofs.length !== proofIds.length) throw bad("Payment proof file not found. Upload it again.");
    const settings = await reimburseSettings(db);
    const claims = await Promise.all(ids.map((id) => claimOr404(db, id)));
    const accounts = new Map<string, Awaited<ReturnType<typeof bankAccountOf>>>();
    for (const c of claims) {
      if (!actionsFor(actor, c).includes("mark_paid")) throw forbidden(`${c.number} cannot be paid yet.`);
      const acct = await bankAccountOf(db, c.userId);
      if (method === "transfer" && settings.requireVerifiedAccount && !acct?.verified) {
        throw bad(`${c.number}: ${await nameOf(db, c.userId)}'s bank account is not verified yet.`);
      }
      accounts.set(c.id, acct);
    }
    return inTx(ctx, async (tx) => {
      const paymentId = (await items(ctx, tx, "reimbursement_payments").createOne({
        date, method, reference, paid_by: actor.id, proof_files: proofIds.map((id) => ({ directus_files_id: id })),
      })) as string;
      for (const c of claims) {
        const acct = method === "transfer" ? accounts.get(c.id) : null;
        await items(ctx, tx, "reimbursements").updateOne(c.id, {
          status: "paid", paid_at: date, payment: paymentId,
          paid_to_bank_name: acct?.bankName ?? null, paid_to_account_number: acct?.accountNumber ?? null, paid_to_account_last4: acct?.accountNumber.slice(-4) ?? null, paid_to_account_holder: acct?.accountHolder ?? null,
        });
        await logTransition(ctx, tx, { collection: "reimbursements", id: c.id, owner: c.userId, sponsor: c.sponsorId, from: c.status, to: "paid", actor: actor.id, note: reference ? `Ref. ${reference}` : null });
        await notify(ctx, tx, [c.userId], "Your reimbursement was paid",
          `${c.number} (${formatRupiah(claimTotal(c))}) has been paid${method === "payroll" ? " via payroll" : " by bank transfer"}. Payment proof is attached.`, href(c.id));
      }
      return { paymentId, paid: claims.length };
    });
  }));

  router.post("/reimbursements/:id/resubmit", route(ctx, async (req, actor) => {
    const claim = await claimOr404(db, req.params.id);
    if (!actionsFor(actor, claim).includes("resubmit")) throw forbidden("This claim can no longer be edited.");
    const title = str(req.body?.title, "Title", { optional: true, max: 200 }).trim();
    const rows = await parseRows(db, req.body, claim.userId);
    const { status, sponsor } = await firstStatus(db, claim.userId);
    return inTx(ctx, async (tx) => {
      await tx.trx("reimbursement_items").where({ claim: claim.id }).delete();
      await items(ctx, tx, "reimbursements").updateOne(claim.id, { title: title || claim.title, status, sponsor, items: itemPayload(rows) });
      await logTransition(ctx, tx, { collection: "reimbursements", id: claim.id, owner: claim.userId, sponsor, from: claim.status, to: status, actor: actor.id, note: "Revised and resubmitted." });
      const reviewers = status === "pending_sponsor" ? [sponsor ?? ""] : await idsByRole(db, "finance");
      await notify(ctx, tx, reviewers, "Reimbursement revised", `${actor.name} resubmitted ${claim.number}.`, status === "pending_sponsor" ? href(claim.id) : "/approvals");
      return { id: claim.id, status };
    });
  }));

  router.post("/reimbursements/:id/action", route(ctx, async (req, actor) => {
    const action = req.body?.action as ReviewAction;
    if (!REVIEW_ACTIONS.includes(action)) throw bad("Unknown action.");
    const note = str(req.body?.note, "Reason", { optional: true, max: 2000 }).trim();
    const claim = await claimOr404(db, req.params.id);
    if (!actionsFor(actor, claim).includes(action as ReimburseAction)) throw forbidden();
    if ((action === "revision" || action === "reject") && !note) throw bad("A reason is required.");
    const passes = action === "confirm" || action === "forward" || action === "approve";
    if (passes && activeItems(claim).length === 0) throw bad("All items are declined. Use Reject to reject the claim.");
    const to = reimburseTransitions[action].to;
    const declinedCount = claim.items.length - activeItems(claim).length;
    const logNote = note || (passes && declinedCount > 0 ? `${declinedCount} item(s) declined.` : null);
    const updated = { ...claim, status: to };
    return inTx(ctx, async (tx) => {
      await items(ctx, tx, "reimbursements").updateOne(claim.id, { status: to });
      await logTransition(ctx, tx, { collection: "reimbursements", id: claim.id, owner: claim.userId, sponsor: claim.sponsorId, from: claim.status, to, actor: actor.id, note: logNote });
      // Peninjau tahap berikutnya dapat notifikasi umum; pemilik dapat notifikasi pribadi.
      const next = action === "confirm" ? await idsByRole(db, "finance")
        : action === "forward" ? await idsByRole(db, "stakeholder")
        : action === "approve" || claim.status === "pending_stakeholder" ? await idsByRole(db, "finance") : [];
      const owner = await nameOf(db, claim.userId);
      await notify(ctx, tx, next.filter((x) => x !== actor.id && x !== claim.userId), `Reimbursement: ${reimburseStatusLabel[to]}`,
        `${claim.number} by ${owner} is now "${reimburseStatusLabel[to]}" (${formatRupiah(claimTotal(updated))}).${note ? ` Reason: ${note}` : ""}`,
        action === "forward" || action === "confirm" ? "/approvals" : "/reimburse-recap");
      const own = await ownerNotice(db, updated, action as NoticeAction, actor.name, note || undefined);
      await notify(ctx, tx, [claim.userId], own.title, own.body, href(claim.id));
      return { id: claim.id, status: to };
    });
  }));

  router.post("/reimbursements/:id/items/:itemId/decline", route(ctx, async (req, actor) => {
    const claim = await claimOr404(db, req.params.id);
    if (!canReviewReimburseItems(actor, claim.userId, claim.status, claim.sponsorId)) throw forbidden("You are not allowed to review this item.");
    const item = claim.items.find((i) => i.id === req.params.itemId);
    if (!item) throw bad("Item not found.");
    const raw = req.body?.note;
    const note = raw === null ? null : str(raw, "Reason", { max: 2000 }).trim();
    if (note !== null && !note) throw bad("A reason is required.");
    return inTx(ctx, async (tx) => {
      await items(ctx, tx, "reimbursement_items").updateOne(item.id, { declined_note: note, declined_by: note === null ? null : actor.id });
      return { id: item.id, declined: note !== null };
    });
  }));

  router.get("/reimbursements/:id/risk", route(ctx, async (req, actor) => {
    const claim = await claimOr404(db, req.params.id);
    const reviewer = actor.role === "finance" || actor.role === "stakeholder" || actor.role === "hr" || claim.sponsorId === actor.id;
    if (!reviewer || actor.id === claim.userId) throw forbidden();
    const now = today();
    const flags = riskFlags(claim, {
      all: await loadRecentClaims(db, addMonths(now, -12)),
      owner: (await loadUser(db, claim.userId)) ?? undefined,
      categories: await categories(db),
      holidays: await holidaySet(db),
      today: now,
    });
    return flags;
  }));
}
