"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Actor } from "@/lib/calc/approval";
import { todayJakarta } from "@/lib/calc/dates";
import type { Team, User } from "@/lib/types";
import { BACKEND } from "@/lib/api/config";
import { ActionError } from "./actions";
import { useBackendSession, type ReloadPart } from "./backend-session";
import { emptyState, initialState, type DataState } from "./state";

export type ToastTone = "success" | "danger" | "neutral";
export type ToastItem = { id: number; title: string; tone: ToastTone };

type AppContextValue = {
  state: DataState;
  /** Tanggal hari ini (Asia/Jakarta). */
  today: string;
  user: User | null;
  /** false selama render server/hidrasi awal; sesi belum terbaca. */
  hydrated: boolean;
  team: Team | null;
  actor: Actor | null;
  /** true = data asli dari backend Directus; false = data dummy (demo). */
  backend: boolean;
  /** Login demo (mode dummy): pilih akun. */
  login: (userId: string, remember?: boolean) => void;
  /** Login email + password (kedua mode). Return pesan error atau null jika berhasil. */
  signIn: (email: string, password: string, remember: boolean) => Promise<string | null>;
  /** Login Microsoft (hanya mode backend, saat SSO aktif di server). */
  signInMicrosoft: (remember: boolean) => void;
  ssoEnabled: boolean;
  logout: () => void;
  /** Jalankan mutasi; error aturan bisnis ditampilkan sebagai toast. Return true jika berhasil. */
  run: (mutate: (s: DataState) => DataState, successMessage?: string) => boolean;
  /** Mode backend: panggil API, muat ulang data terkait, tampilkan toast. Return true jika berhasil. */
  call: (fn: () => Promise<unknown>, successMessage?: string, reload?: ReloadPart[]) => Promise<boolean>;
  reload: (part?: ReloadPart) => Promise<void>;
  toasts: ToastItem[];
  toast: (title: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

const SESSION_KEY = "hris-session";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((cb) => cb());

/** "Remember me" → localStorage (tetap masuk setelah browser ditutup); tanpa itu → sessionStorage. */
function readSession(): string | null {
  return localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
}

function readTheme(): "dark" | "light" {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

let toastSeq = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(BACKEND ? emptyState : initialState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Tanggal asli (WIB). Data demo dibuat sekitar 7 Okt 2026, tapi pengajuan baru memakai hari ini.
  const [today] = useState(() => todayJakarta());
  const sessionId = useSyncExternalStore(subscribe, readSession, () => null);
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as const);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (title: string, tone: ToastTone = "neutral") => {
      const id = ++toastSeq;
      setToasts((t) => [...t, { id, title, tone }]);
      window.setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast],
  );

  const backendSession = useBackendSession(setState, toast);
  const hydrated = BACKEND ? mounted && backendSession.checked : mounted;
  const activeId = BACKEND ? backendSession.meId : sessionId;
  const user = useMemo(() => state.users.find((u) => u.id === activeId) ?? null, [state.users, activeId]);
  const team = useMemo(() => state.teams.find((t) => t.id === user?.teamId) ?? null, [state.teams, user]);
  const actor = useMemo<Actor | null>(() => (user ? { id: user.id, role: user.role } : null), [user]);

  const run = useCallback(
    (mutate: (s: DataState) => DataState, successMessage?: string) => {
      try {
        const next = mutate(state);
        setState(next);
        if (successMessage) toast(successMessage, "success");
        return true;
      } catch (e) {
        if (e instanceof ActionError) {
          toast(e.message, "danger");
          return false;
        }
        throw e;
      }
    },
    [state, toast],
  );

  const login = useCallback((userId: string, remember = true) => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, userId);
    emit();
  }, []);

  const { signIn: backendSignIn, signOut, signInMicrosoft, reload, ssoEnabled } = backendSession;

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean) => {
      if (BACKEND) return backendSignIn(email, password, remember);
      const found = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!found || password.length === 0) return "Wrong email or password.";
      if (!found.active) return "This account is inactive. Contact HR.";
      if (found.role === "external" && found.external && found.external.accessUntil < todayJakarta()) return "Your access period has ended. Contact your PIC.";
      login(found.id, remember);
      return null;
    },
    [backendSignIn, state.users, login],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (BACKEND) {
      void signOut();
      setState(emptyState);
    }
    emit();
  }, [signOut]);

  const call = useCallback(
    async (fn: () => Promise<unknown>, successMessage?: string, parts: ReloadPart[] = ["claims"]) => {
      try {
        await fn();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Something went wrong. Please try again.", "danger");
        return false;
      }
      if (successMessage) toast(successMessage, "success");
      await Promise.all(parts.map((p) => reload(p).catch(() => undefined)));
      return true;
    },
    [reload, toast],
  );

  const toggleTheme = useCallback(() => {
    const light = document.documentElement.classList.toggle("light");
    localStorage.setItem("theme", light ? "light" : "dark");
    emit();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state, today, user, hydrated, team, actor, backend: BACKEND, login, signIn, signInMicrosoft, ssoEnabled, logout, run, call, reload,
      toasts, toast, dismissToast, theme, toggleTheme,
    }),
    [state, today, user, hydrated, team, actor, login, signIn, signInMicrosoft, ssoEnabled, logout, run, call, reload, toasts, toast, dismissToast, theme, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp harus dipakai di dalam <AppProvider>");
  return ctx;
}

/** Versi useApp yang menjamin user sudah login (dipakai di halaman dalam layout terproteksi). */
export function useAuthed() {
  const ctx = useApp();
  if (!ctx.user || !ctx.actor) throw new Error("User belum login");
  return { ...ctx, user: ctx.user, actor: ctx.actor };
}
