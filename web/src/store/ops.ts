"use client";

/**
 * Satu pintu untuk semua aksi Reimburse / rekening / pegawai / pengaturan / notifikasi.
 * Mode backend → panggil API (aturan dijaga server). Mode demo → fungsi murni di store (data dummy).
 * Semua fungsi mengembalikan Promise<boolean> (true = berhasil); error ditampilkan sebagai toast.
 */
import { useMemo } from "react";
import type { ReimburseAction } from "@/lib/calc/approval";
import type { ReimburseRowInput } from "@/lib/calc/reimburse";
import { accountApi, fxApi, importFromUrl, reimburseApi, saveMasterApi, saveSettingsApi, uploadMany } from "@/lib/api/mutations";
import type { AppSettings } from "@/lib/settings-types";
import type { BankAccount, FileRef, ReimbursePayment, User } from "@/lib/types";
import { saveBankAccount, verifyBankAccount } from "./actions-bank";
import { markNotificationsRead, saveMaster, saveSettings, saveUser } from "./actions-business";
import { actOnReimburse, payReimburseClaims, reviseReimburseClaim, setReimburseItemDecline, submitReimburseClaim } from "./actions-reimburse";
import { useAuthed } from "./app-provider";
import type { DataState } from "./state";

export type ReviewAction = Exclude<ReimburseAction, "mark_paid" | "resubmit">;
export type MasterKey = "reimbursementCategories" | "holidays" | "teams";
export type UserDraft = Omit<User, "id" | "employeeCode"> & { id?: string; password?: string };

export function useOps() {
  const { state, user, actor, today, backend, run, call, toast } = useAuthed();

  return useMemo(() => {
    const mock = (fn: Parameters<typeof run>[0], msg?: string) => Promise.resolve(run(fn, msg));
    return {
      /** Upload file. Mode backend: langsung disimpan di server (folder struk / bukti bayar). */
      upload: async (files: File[], kind: "receipt" | "proof"): Promise<FileRef[] | null> => {
        if (files.length === 0) return [];
        if (!backend) return files.map((x) => ({ name: x.name, url: URL.createObjectURL(x) }));
        try {
          return await uploadMany(files, kind);
        } catch (e) {
          toast(e instanceof Error ? `Upload failed: ${e.message}` : "Upload failed.", "danger");
          return null;
        }
      },

      /** Ambil file dari link (server yang mengunduh & menyimpan). */
      importUrl: async (url: string, kind: "receipt" | "proof"): Promise<FileRef | null> => {
        if (!backend) return { name: url.split("/").pop() || url, url };
        try {
          return await importFromUrl(url, kind);
        } catch (e) {
          toast(e instanceof Error ? `Couldn't get the file from that link: ${e.message}` : "Couldn't get the file from that link.", "danger");
          return null;
        }
      },

      submitClaim: (title: string, rows: ReimburseRowInput[], msg: string) =>
        backend ? call(() => reimburseApi.submit(title, rows), msg) : mock((s) => submitReimburseClaim(s, user.id, title, rows, today), msg),
      reviseClaim: (id: string, title: string, rows: ReimburseRowInput[], msg: string) =>
        backend ? call(() => reimburseApi.resubmit(id, title, rows), msg) : mock((s) => reviseReimburseClaim(s, id, actor, title, rows, today), msg),
      actOnClaim: (id: string, action: ReviewAction, note: string | undefined, msg: string) =>
        backend ? call(() => reimburseApi.act(id, action, note), msg) : mock((s) => actOnReimburse(s, id, action, actor, note), msg),
      declineItem: (id: string, itemId: string, note: string | null, msg: string) =>
        backend ? call(() => reimburseApi.decline(id, itemId, note), msg) : mock((s) => setReimburseItemDecline(s, id, itemId, note, actor), msg),
      payClaims: (ids: string[], p: Omit<ReimbursePayment, "byUserId" | "toAccount">, msg: string) =>
        backend ? call(() => reimburseApi.pay(ids, p), msg) : mock((s) => payReimburseClaims(s, ids, p, actor), msg),

      saveBank: (userId: string, a: Pick<BankAccount, "bankName" | "accountNumber" | "accountHolder">, msg: string) =>
        backend ? call(() => accountApi.saveBank(userId, a), msg, ["users"]) : mock((s) => saveBankAccount(s, userId, a, actor), msg),
      verifyBank: (userId: string, msg: string) =>
        backend ? call(() => accountApi.verifyBank(userId), msg, ["users"]) : mock((s) => verifyBankAccount(s, userId, actor), msg),

      markRead: (ids?: string[]) =>
        backend
          ? call(() => (ids ? Promise.all(ids.map(accountApi.readOne)) : accountApi.readAll()), undefined, ["notifications"])
          : mock((s) => markNotificationsRead(s, user.id, ids)),

      saveUser: (d: UserDraft, msg: string) =>
        backend ? call(() => accountApi.saveUser(d), msg, ["users"]) : mock((s) => saveUser(s, d), msg),

      saveSettings: <K extends keyof AppSettings>(key: K, value: AppSettings[K], msg: string) =>
        backend ? call(() => saveSettingsApi(key, value), msg, ["all"]) : mock((s) => saveSettings(s, key, value), msg),
      /** Ambil kurs USD terbaru dari server (hanya mode backend). */
      refreshFx: () => (backend ? call(() => fxApi.refresh(), "Exchange rate updated.", ["all"]) : Promise.resolve(false)),
      saveMaster: <K extends MasterKey>(key: K, rows: DataState[K], msg: string) =>
        backend
          ? call(() => saveMasterApi(key, state[key], rows), msg, ["all"])
          : mock((s) => saveMaster(s, key, rows), msg),
    };
  }, [state, user.id, actor, today, backend, run, call, toast]);
}
