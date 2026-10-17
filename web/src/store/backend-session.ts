"use client";

/**
 * Sesi & data dari backend Directus (mode BACKEND). Dipakai oleh AppProvider.
 * - Cek sesi (cookie) saat aplikasi dibuka, lalu muat data modul yang sudah dirilis.
 * - Realtime: notifikasi baru langsung muncul; perubahan klaim/rekening dari orang lain langsung terlihat.
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { apiGet, apiSend } from "@/lib/api/client";
import { BACKEND } from "@/lib/api/config";
import { loadAll, loadClaims, loadNotifications, loadUsers } from "@/lib/api/load";
import { toNotification, type NotificationRow } from "@/lib/api/mappers";
import { roleFromId } from "@/lib/api/ids";
import { connectRealtime } from "@/lib/api/realtime";
import { defaultSettings } from "@/lib/mock/settings";
import type { DataState } from "./state";

export type ReloadPart = "all" | "claims" | "users" | "notifications";

/** Diarahkan ke Microsoft, lalu kembali ke /auth/callback dengan sesi aktif. */
export const MICROSOFT_LOGIN_URL = `/panel/auth/login/microsoft?redirect=${encodeURIComponent("/auth/callback")}`;

/** Akun tanpa role SIDESAH (mis. admin teknis Directus) hanya untuk panel /panel, bukan aplikasi. */
const NO_ROLE = "This account is for the technical admin panel (/panel), not the SIDESAH app. Sign in with an employee account.";

async function currentUser(): Promise<{ id: string; role: string | null }> {
  return apiGet<{ id: string; role: string | null }>("/users/me", { fields: "id,role" });
}

const EPHEMERAL = "sidesah-ephemeral";
const ALIVE = "sidesah-alive";

/** "Remember me" tidak dicentang → sesi berakhir saat browser ditutup (penanda di sessionStorage hilang). */
function sessionExpiredByBrowserClose(): boolean {
  try {
    return localStorage.getItem(EPHEMERAL) === "1" && sessionStorage.getItem(ALIVE) !== "1";
  } catch {
    return false;
  }
}

function markRemember(remember: boolean) {
  try {
    if (remember) localStorage.removeItem(EPHEMERAL);
    else localStorage.setItem(EPHEMERAL, "1");
    sessionStorage.setItem(ALIVE, "1");
  } catch {
    // storage diblokir: sesi tetap mengikuti cookie
  }
}

export function useBackendSession(setState: Dispatch<SetStateAction<DataState>>, toast: (t: string, tone?: "success" | "danger" | "neutral") => void) {
  const [meId, setMeId] = useState<string | null>(null);
  const [checked, setChecked] = useState(!BACKEND);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const meRef = useRef<string | null>(null);

  const reload = useCallback(async (part: ReloadPart = "all", userId = meRef.current) => {
    if (!BACKEND || !userId) return;
    if (part === "all") {
      const data = await loadAll(userId, defaultSettings);
      setState((s) => ({ ...s, ...data }));
    } else if (part === "claims") {
      const reimbursements = await loadClaims();
      setState((s) => ({ ...s, reimbursements }));
    } else if (part === "users") {
      const users = await loadUsers();
      setState((s) => ({ ...s, users }));
    } else {
      const notifications = await loadNotifications(userId);
      setState((s) => ({ ...s, notifications }));
    }
  }, [setState]);

  // Cek sesi sekali saat aplikasi dibuka.
  useEffect(() => {
    if (!BACKEND) return;
    let cancelled = false;
    (async () => {
      apiGet<{ name: string }[]>("/auth").then((p) => !cancelled && setSsoEnabled(p.some((x) => x.name === "microsoft"))).catch(() => undefined);
      try {
        if (sessionExpiredByBrowserClose()) await apiSend("POST", "/auth/logout", { mode: "session" }).catch(() => undefined);
        const me = await currentUser();
        if (!roleFromId(me.role)) return;
        await reload("all", me.id);
        if (!cancelled) {
          meRef.current = me.id;
          setMeId(me.id);
        }
      } catch {
        // belum login / sesi habis
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // Realtime selama login.
  useEffect(() => {
    if (!BACKEND || !meId) return;
    const pending = new Set<ReloadPart>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Banyak event beruntun (1 klaim = beberapa baris) digabung jadi satu kali muat ulang.
    const schedule = (part: ReloadPart) => {
      pending.add(part);
      clearTimeout(timer);
      timer = setTimeout(() => {
        const parts = [...pending];
        pending.clear();
        parts.forEach((p) => void reload(p).catch(() => undefined));
      }, 400);
    };
    const rt = connectRealtime(
      [
        { collection: "notifications", query: { fields: ["id", "recipient", "title", "body", "href", "read", "date_created"], filter: { recipient: { _eq: meId } } } },
        { collection: "reimbursements" },
        { collection: "reimbursement_items" },
        { collection: "bank_accounts" },
      ],
      (e) => {
        if (e.collection === "notifications" && e.event === "create") {
          const rows = (e.data as NotificationRow[]).filter((n) => n.recipient === meId);
          if (rows.length === 0) return;
          setState((s) => ({ ...s, notifications: [...rows.map(toNotification), ...s.notifications.filter((n) => !rows.some((r) => r.id === n.id))] }));
          toast(rows[0].title, "neutral");
        } else if (e.collection === "notifications") schedule("notifications");
        else if (e.collection === "bank_accounts") schedule("users");
        else schedule("claims");
      },
    );
    return () => {
      clearTimeout(timer);
      rt.close();
    };
  }, [meId, reload, setState, toast]);

  const signIn = useCallback(async (email: string, password: string, remember: boolean): Promise<string | null> => {
    try {
      await apiSend("POST", "/auth/login", { email: email.trim().toLowerCase(), password, mode: "session" });
      markRemember(remember);
      const me = await currentUser();
      if (!roleFromId(me.role)) {
        await apiSend("POST", "/auth/logout", { mode: "session" }).catch(() => undefined);
        return NO_ROLE;
      }
      await reload("all", me.id);
      meRef.current = me.id;
      setMeId(me.id);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Sign in failed.";
    }
  }, [reload]);

  const signOut = useCallback(async () => {
    await apiSend("POST", "/auth/logout", { mode: "session" }).catch(() => undefined);
    meRef.current = null;
    setMeId(null);
  }, []);

  /** Login Microsoft: catat pilihan "Remember me", lalu tautan /panel/auth/login/microsoft dibuka (lihat MICROSOFT_LOGIN_URL). */
  const signInMicrosoft = useCallback((remember: boolean) => markRemember(remember), []);

  return { meId, checked, ssoEnabled, reload, signIn, signOut, signInMicrosoft };
}
