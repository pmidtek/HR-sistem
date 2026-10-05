"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Actor } from "@/lib/calc/approval";
import { MOCK_TODAY } from "@/lib/mock/work";
import type { Team, User } from "@/lib/types";
import { ActionError } from "./actions";
import { initialState, type DataState } from "./state";

export type ToastTone = "success" | "danger" | "neutral";
export type ToastItem = { id: number; title: string; tone: ToastTone };

type AppContextValue = {
  state: DataState;
  /** Tanggal "hari ini" untuk demo data dummy. Nanti diganti todayJakarta(). */
  today: string;
  user: User | null;
  /** false selama render server/hidrasi awal; sesi belum terbaca. */
  hydrated: boolean;
  team: Team | null;
  actor: Actor | null;
  login: (userId: string) => void;
  logout: () => void;
  /** Jalankan mutasi; error aturan bisnis ditampilkan sebagai toast. Return true jika berhasil. */
  run: (mutate: (s: DataState) => DataState, successMessage?: string) => boolean;
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

function readSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function readTheme(): "dark" | "light" {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

let toastSeq = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(initialState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const sessionId = useSyncExternalStore(subscribe, readSession, () => null);
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as const);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  const user = useMemo(() => state.users.find((u) => u.id === sessionId) ?? null, [state.users, sessionId]);
  const team = useMemo(() => state.teams.find((t) => t.id === user?.teamId) ?? null, [state.teams, user]);
  const actor = useMemo<Actor | null>(() => (user ? { id: user.id, role: user.role } : null), [user]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (title: string, tone: ToastTone = "neutral") => {
      const id = ++toastSeq;
      setToasts((t) => [...t, { id, title, tone }]);
      window.setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast],
  );

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

  const login = useCallback((userId: string) => {
    localStorage.setItem(SESSION_KEY, userId);
    emit();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    emit();
  }, []);

  const toggleTheme = useCallback(() => {
    const light = document.documentElement.classList.toggle("light");
    localStorage.setItem("theme", light ? "light" : "dark");
    emit();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ state, today: MOCK_TODAY, user, hydrated, team, actor, login, logout, run, toasts, toast, dismissToast, theme, toggleTheme }),
    [state, user, hydrated, team, actor, login, logout, run, toasts, toast, dismissToast, theme, toggleTheme],
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
