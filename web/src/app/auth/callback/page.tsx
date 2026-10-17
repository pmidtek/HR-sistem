"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { GradientBackdrop } from "@/components/login/gradient-backdrop";

/** Pesan untuk kode alasan yang dikirim Directus saat login Microsoft gagal. */
const reasons: Record<string, string> = {
  INVALID_CREDENTIALS: "Your Microsoft account isn't registered in SIDESAH yet. Ask HR to add you (or run the Microsoft sync).",
  INVALID_PROVIDER: "This account signs in with email and password, not Microsoft.",
  USER_SUSPENDED: "Your account is inactive. Contact HR.",
  SERVICE_UNAVAILABLE: "Microsoft sign-in is not available right now. Try again later.",
};

function Callback() {
  const reason = useSearchParams().get("reason");
  useEffect(() => {
    // Sesi sudah dibuat server (cookie). Muat ulang penuh supaya aplikasi membaca sesi baru.
    if (!reason) window.location.replace("/dashboard");
  }, [reason]);
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white">
      <GradientBackdrop />
      {reason ? (
        <>
          <h1 className="font-display text-xl font-semibold">Couldn&apos;t sign in with Microsoft</h1>
          <p className="max-w-md text-sm text-white/70">{reasons[reason] ?? `Sign-in failed (${reason}).`}</p>
          <Link href="/login" className="rounded-xxs bg-white px-5 py-2 text-sm font-medium text-[#1a1614]">Back to sign in</Link>
        </>
      ) : (
        <p className="text-sm text-white/70">Signing you in…</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
