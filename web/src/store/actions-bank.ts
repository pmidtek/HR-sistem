/**
 * Rekening tujuan reimburse (pure). Setiap perubahan membuat rekening "belum diverifikasi";
 * hanya Finance (bukan pemilik rekening) yang bisa memverifikasi. Simulasi custom endpoint Directus.
 */
import type { Actor } from "@/lib/calc/approval";
import type { BankAccount } from "@/lib/types";
import { ActionError, idsByRole, nameOf, notify } from "./actions";
import { nowIso, type DataState } from "./state";

export type BankAccountInput = Pick<BankAccount, "bankName" | "accountNumber" | "accountHolder">;

export function saveBankAccount(s: DataState, userId: string, input: BankAccountInput, actor: Actor): DataState {
  if (actor.id !== userId && actor.role !== "hr" && actor.role !== "finance") throw new ActionError("You can only change your own bank account.");
  const accountNumber = input.accountNumber.replace(/[\s-]/g, "");
  if (!input.bankName.trim() || !input.accountHolder.trim()) throw new ActionError("Bank name and account holder are required.");
  if (!/^\d{6,20}$/.test(accountNumber)) throw new ActionError("Account number must be 6–20 digits.");
  const prev = s.users.find((u) => u.id === userId)?.bankAccount;
  const same = prev && prev.bankName === input.bankName.trim() && prev.accountNumber === accountNumber && prev.accountHolder === input.accountHolder.trim();
  if (same) return s;
  const account: BankAccount = {
    bankName: input.bankName.trim(), accountNumber, accountHolder: input.accountHolder.trim(),
    verified: false, verifiedBy: null, updatedAt: nowIso(),
  };
  return {
    ...s,
    users: s.users.map((u) => (u.id === userId ? { ...u, bankAccount: account } : u)),
    notifications: notify(s, idsByRole(s, "finance").filter((id) => id !== userId), "Bank account needs verification", `${nameOf(s, userId)} ${prev ? "changed" : "added"} their payout bank account. Verify it before the next transfer.`, "/employees"),
  };
}

export function verifyBankAccount(s: DataState, userId: string, actor: Actor): DataState {
  if (actor.role !== "finance") throw new ActionError("Only Finance can verify bank accounts.");
  if (actor.id === userId) throw new ActionError("You can't verify your own bank account.");
  const u = s.users.find((x) => x.id === userId);
  if (!u?.bankAccount) throw new ActionError("No bank account to verify.");
  return {
    ...s,
    users: s.users.map((x) => (x.id === userId && x.bankAccount ? { ...x, bankAccount: { ...x.bankAccount, verified: true, verifiedBy: actor.id } } : x)),
    notifications: notify(s, [userId], "Bank account verified", `Your payout account (${u.bankAccount.bankName}) was verified by ${nameOf(s, actor.id)}.`, "/reimbursements"),
  };
}
