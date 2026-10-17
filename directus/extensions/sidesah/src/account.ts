/**
 * Profil, rekening, notifikasi.
 *   GET  /sidesah/me                              profil + role aplikasi
 *   PUT  /sidesah/bank-accounts/:userId           { bankName, accountNumber, accountHolder }  → jadi "belum diverifikasi"
 *   POST /sidesah/bank-accounts/:userId/verify    khusus Finance, bukan rekening sendiri
 *   POST /sidesah/notifications/read-all
 */
import type { Router } from "express";
import { bad, forbidden, idsByRole, inTx, items, nameOf, notify, route, str, type Ctx } from "./lib/context";
import { loadUser } from "./reimburse/repo";

export function accountRoutes(router: Router, ctx: Ctx) {
  const db = ctx.database;

  router.get("/me", route(ctx, async (_req, actor) => {
    const u = await loadUser(db, actor.id);
    return u ? { ...u, role: actor.role } : null;
  }));

  router.put("/bank-accounts/:userId", route(ctx, async (req, actor) => {
    const userId = req.params.userId;
    if (actor.id !== userId && actor.role !== "hr" && actor.role !== "finance") throw forbidden("You can only change your own bank account.");
    const bankName = str(req.body?.bankName, "Bank name", { max: 100 }).trim();
    const accountHolder = str(req.body?.accountHolder, "Account holder", { max: 200 }).trim();
    const accountNumber = str(req.body?.accountNumber, "Account number", { max: 40 }).replace(/[\s-]/g, "");
    if (!/^\d{6,20}$/.test(accountNumber)) throw bad("Account number must be 6–20 digits.");
    const prev = await db("bank_accounts").where({ owner: userId }).first<{ id: string; bank_name: string; account_number: string; account_holder: string } | undefined>();
    if (prev && prev.bank_name === bankName && prev.account_number === accountNumber && prev.account_holder === accountHolder) return { changed: false };
    return inTx(ctx, async (tx) => {
      const data = { bank_name: bankName, account_number: accountNumber, account_last4: accountNumber.slice(-4), account_holder: accountHolder, verified: false, verified_by: null, verified_at: null };
      if (prev) await items(ctx, tx, "bank_accounts").updateOne(prev.id, data);
      else await items(ctx, tx, "bank_accounts").createOne({ owner: userId, ...data });
      const who = await nameOf(db, userId);
      await notify(ctx, tx, (await idsByRole(db, "finance")).filter((id) => id !== userId), "Bank account needs verification",
        `${who} ${prev ? "changed" : "added"} their payout bank account. Verify it before the next transfer.`, "/employees");
      return { changed: true };
    });
  }));

  router.post("/bank-accounts/:userId/verify", route(ctx, async (req, actor) => {
    const userId = req.params.userId;
    if (actor.role !== "finance") throw forbidden("Only Finance can verify bank accounts.");
    if (actor.id === userId) throw forbidden("You can't verify your own bank account.");
    const acct = await db("bank_accounts").where({ owner: userId }).first<{ id: string; bank_name: string } | undefined>();
    if (!acct) throw bad("No bank account to verify.");
    return inTx(ctx, async (tx) => {
      await items(ctx, tx, "bank_accounts").updateOne(acct.id, { verified: true, verified_by: actor.id, verified_at: new Date().toISOString() });
      await notify(ctx, tx, [userId], "Bank account verified", `Your payout account (${acct.bank_name}) was verified by ${actor.name}.`, "/reimbursements");
      return { verified: true };
    });
  }));

  router.post("/notifications/read-all", route(ctx, async (_req, actor) => {
    const n = await db("notifications").where({ recipient: actor.id, read: false }).update({ read: true });
    return { updated: n };
  }));
}
