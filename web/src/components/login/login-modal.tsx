"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { ArrowRight, Eye, EyeOff, X } from "lucide-react";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { roleLabel } from "@/lib/access";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-provider";

export type LoginTab = "login" | "demo";

function MicrosoftLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

// Modal selalu gelap (latar login gelap), jadi warnanya tetap, tidak ikut tema terang/gelap.
const field = "h-10 w-full rounded-xxs bg-white/[0.04] px-3 text-sm text-white outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] placeholder:text-white/30 focus:shadow-[inset_0_0_0_1px_var(--brand)]";
const label = "mb-1.5 block text-xs text-white/80";

export function LoginModal({ tab, onTabChange, onClose }: { tab: LoginTab; onTabChange: (t: LoginTab) => void; onClose: () => void }) {
  const { state, login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [remember, setRemember] = useState(true);
  const demo = ["u1", "u2", "u3", "u4", "u5", "u6"].map((id) => state.users.find((u) => u.id === id)).filter((u) => u !== undefined);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found || password.length === 0) return setError("Wrong email or password.");
    login(found.id, remember);
  }

  return (
    <RadixDialog.Root open onOpenChange={(o) => !o && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay asChild>
          <motion.div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        </RadixDialog.Overlay>
        <RadixDialog.Content asChild aria-describedby={undefined}>
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-m bg-[#1a1614] p-6 font-mono text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_30px_80px_-20px_rgba(0,0,0,0.8)]"
          >
            <RadixDialog.Close className="absolute top-4 right-4 rounded-xxs p-1 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Close">
              <X size={16} strokeWidth={1.5} />
            </RadixDialog.Close>
            <RadixDialog.Title className="text-xl font-semibold tracking-[-0.02em]">{tab === "login" ? "Sign in to your account" : "Try a demo account"}</RadixDialog.Title>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              {tab === "login" ? "Use your work account. Accounts are created by HR." : "Pick a role to sign in instantly."}
            </p>

            <div role="tablist" className="mt-5 inline-flex rounded-xs bg-white/[0.05] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              {(["login", "demo"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => onTabChange(t)}
                  className={cn("rounded-xxs px-3 py-1 text-xs transition-colors", tab === t ? "bg-[#0f0c0b] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" : "text-white/50 hover:text-white")}
                >
                  {t === "login" ? "Sign in" : "Demo accounts"}
                </button>
              ))}
            </div>

            {tab === "login" ? (
              <div className="mt-6 flex flex-col gap-5">
                <button type="button" disabled className="flex h-10 items-center justify-center gap-2.5 rounded-xxs text-xs text-white/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                  <MicrosoftLogo /> Continue with Microsoft
                  <span className="rounded-xxs bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">soon</span>
                </button>
                <div className="flex items-center gap-3 text-[10px] text-white/40">
                  <span className="h-px flex-1 bg-white/10" /> OR <span className="h-px flex-1 bg-white/10" />
                </div>
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="login-email" className={label}>Email</label>
                    <input id="login-email" type="email" autoComplete="email" placeholder="name@company.co.id" value={email} onChange={(e) => { setEmail(e.target.value); setError(undefined); }} className={field} />
                  </div>
                  <div>
                    <label htmlFor="login-password" className={label}>Password</label>
                    <div className="relative">
                      <input id="login-password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(undefined); }} className={cn(field, "pr-10")} />
                      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute top-1/2 right-3 -translate-y-1/2 text-white/40 hover:text-white">
                        {show ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                      </button>
                    </div>
                    {error && <p className="mt-1.5 text-xs text-[#ff8a6b]">{error}</p>}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70 select-none">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-3.5 accent-[var(--brand)]" />
                    Remember me
                  </label>
                  <button type="submit" className="flex h-10 items-center justify-center gap-2 rounded-xxs bg-white text-sm font-medium text-[#1a1614] transition-colors hover:bg-white/90">
                    Sign in <ArrowRight size={15} strokeWidth={1.5} />
                  </button>
                </form>
              </div>
            ) : (
              <ul className="mt-6 flex flex-col gap-1.5">
                {demo.map((u) => (
                  <li key={u.id}>
                    <button type="button" onClick={() => login(u.id)} className="flex w-full items-center gap-3 rounded-xxs px-3 py-2.5 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-colors hover:bg-white/[0.05]">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] text-white/70">{u.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm">{u.name}</span>
                        <span className="truncate text-[11px] text-white/45">
                          {roleLabel[u.role]}{u.role === "employee" && ` · ${state.teams.find((t) => t.id === u.teamId)?.name ?? ""}`}
                        </span>
                      </span>
                      <ArrowRight size={14} strokeWidth={1.5} className="text-white/30" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
