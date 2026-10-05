"use client";

import { ArrowRight, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { roleLabel } from "@/lib/access";
import { useApp } from "@/store/app-provider";
import { Logo } from "@/components/shell/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, Eyebrow } from "@/components/ui/display";
import { Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default function LoginPage() {
  const { state, user, login } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found || password.length === 0) {
      setError("Email atau password salah.");
      return;
    }
    login(found.id);
  }

  const demo = ["u1", "u2", "u3", "u4", "u5", "u6"].map((id) => state.users.find((u) => u.id === id)).filter((u) => u !== undefined);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line glass p-12 lg:flex">
        <Logo />
        <div className="flex flex-col gap-6">
          <Eyebrow tone="success">Semua sistem berjalan</Eyebrow>
          <h1 className="max-w-lg font-serif text-6xl leading-[1.05] tracking-[-0.02em] text-fg">
            Catat kerja hari ini. <em className="text-fg-brand">Gajian tanpa drama.</em>
          </h1>
          <p className="max-w-md text-md text-fg-muted">
            Timesheet, cuti, lembur, reimburse, sampai slip gaji. Semua di satu tempat, dengan alur persetujuan yang jelas.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 border-t border-line pt-6">
          {[["15 mnt", "Ketelitian timesheet"], ["2 tahap", "Alur persetujuan"], ["Otomatis", "Lembur & slip gaji"]].map(([v, l]) => (
            <div key={l}>
              <p className="font-serif text-3xl text-fg">{v}</p>
              <p className="text-xs text-fg-subtle">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-2xl font-medium tracking-[-0.02em]">Masuk</h2>
            <p className="text-sm text-fg-muted">Gunakan akun kantor Anda.</p>
          </div>

          <Button variant="secondary" tone="neutral" fullWidth disabled iconLeft={<MicrosoftLogo />}>
            Masuk dengan Microsoft (segera)
          </Button>

          <div className="flex items-center gap-3 text-xs text-fg-subtle">
            <span className="h-px flex-1 bg-line" />
            atau
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input label="Email" type="email" autoComplete="email" placeholder="nama@perusahaan.co.id" value={email} onChange={(e) => setEmail(e.target.value)} iconLeft={<Icon icon={Mail} />} />
            <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} iconLeft={<Icon icon={Lock} />} error={error} />
            <Button type="submit" fullWidth iconRight={<Icon icon={ArrowRight} />}>
              Masuk
            </Button>
          </form>

          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] tracking-[0.08em] text-fg-subtle uppercase">Akun demo (klik untuk masuk)</p>
            <div className="grid grid-cols-1 gap-1.5">
              {demo.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => login(u.id)}
                  className="flex items-center gap-3 rounded-xs px-2.5 py-2 text-left shadow-[inset_0_0_0_1px_var(--border-default)] hover:bg-hover"
                >
                  <Avatar name={u.name} size="small" />
                  <span className="flex-1 text-sm text-fg">{u.name}</span>
                  <span className="text-xs text-fg-subtle">
                    {roleLabel[u.role]}
                    {u.role === "employee" && ` · ${state.teams.find((t) => t.id === u.teamId)?.name ?? ""}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
