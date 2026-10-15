"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/store/app-provider";
import { IdtekLogo, PoweredByCartogram } from "@/components/brand/logos";
import { GradientBackdrop } from "@/components/login/gradient-backdrop";
import { LoginIllustration } from "@/components/login/login-illustration";
import { LoginModal, type LoginTab } from "@/components/login/login-modal";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export default function LoginPage() {
  const { user } = useApp();
  const router = useRouter();
  const [modal, setModal] = useState<LoginTab | null>(null);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  return (
    <div className="relative isolate flex min-h-screen flex-col text-white">
      <GradientBackdrop />

      <header className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <IdtekLogo tone="light" />
        <button type="button" onClick={() => setModal("login")} className="rounded-xxs px-3 py-1.5 text-xs text-white/75 hover:bg-white/10 hover:text-white">
          Masuk
        </button>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <motion.div {...rise(0)}>
          <LoginIllustration />
        </motion.div>
        <motion.h1
          {...rise(0.1)}
          className="mt-14 font-mono text-4xl font-semibold tracking-[-0.04em] sm:text-7xl"
          style={{ textShadow: "0 0 40px rgba(243,106,29,0.45), 0 0 90px rgba(243,106,29,0.25)" }}
        >
          idtek <span className="font-normal text-[#f4a261]">dashboard</span>
        </motion.h1>
        <motion.p {...rise(0.18)} className="mt-4 text-sm text-white/65 sm:text-base">
          Timesheet, cuti, reimburse, sampai gaji.
        </motion.p>
        <motion.div {...rise(0.26)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => setModal("login")} className="h-10 rounded-xxs bg-white px-7 text-sm font-medium text-[#1a1614] shadow-[0_10px_30px_-10px_rgba(243,106,29,0.6)] transition-colors hover:bg-white/90">
            Masuk
          </button>
          <button type="button" onClick={() => setModal("demo")} className="h-10 rounded-xxs bg-white/[0.06] px-7 text-sm text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-md transition-colors hover:bg-white/[0.12]">
            Coba akun demo
          </button>
        </motion.div>
        <motion.p {...rise(0.32)} className="mt-5 text-xs text-white/40">
          Akun dibuat oleh HR. Belum punya? Hubungi HR.
        </motion.p>
      </main>

      <footer className="relative flex items-center justify-center px-6 py-6">
        <PoweredByCartogram tone="light" />
      </footer>

      {modal && <LoginModal tab={modal} onTabChange={setModal} onClose={() => setModal(null)} />}
    </div>
  );
}
