import Image from "next/image";
import { cn } from "@/lib/cn";

/** Ikon resmi IDTEK (bagian ikon dari Logo.svg, tanpa tulisan). Dipakai juga sebagai favicon (app/icon.png). */
export function IdtekMark({ className }: { className?: string }) {
  return <Image src="/brand/idtek-icon.png" alt="" width={28} height={28} priority className={cn("size-7", className)} />;
}

export const APP_NAME = "SIDESAH";
export const APP_FULL_NAME = "Sistem Informasi Data Elektronik Slip & Absensi Harian";

/** Kepanjangan nama dengan huruf awal tiap kata disorot (S·I·D·E·S·A·H). */
export function AcronymLine({ tone = "auto", className }: { tone?: "auto" | "light"; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap justify-center gap-x-[0.5em] font-mono tracking-[0.04em]", tone === "light" ? "text-white/55" : "text-fg-subtle", className)} aria-label={APP_FULL_NAME}>
      {APP_FULL_NAME.split(" ").map((w, i) => (
        <span key={i} aria-hidden>
          {w === "&" ? w : <><span className={tone === "light" ? "text-[#f4a261]" : "text-fg-brand"}>{w[0]}</span>{w.slice(1)}</>}
        </span>
      ))}
    </span>
  );
}

/** Logo aplikasi: ikon IDTEK + wordmark SIDESAH. `tone="light"` untuk latar gelap. */
export function IdtekLogo({ tone = "auto", className }: { tone?: "auto" | "light"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} title={APP_FULL_NAME}>
      <IdtekMark />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[15px] font-semibold tracking-[0.14em]", tone === "light" ? "text-white" : "text-fg")}>{APP_NAME}</span>
        <span className={cn("mt-1 font-mono text-[9px] tracking-[0.12em] uppercase", tone === "light" ? "text-white/45" : "text-fg-subtle")}>by IDTEK</span>
      </span>
    </span>
  );
}

/** Tanda Cartogram sementara (file logo resmi Cartogram belum ada): petak-petak seperti peta kartogram. */
export function CartogramMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("size-3.5", className)} aria-hidden>
      <rect x="0" y="0" width="7" height="9" rx="1.5" fill="#F36A1D" />
      <rect x="9" y="0" width="7" height="5" rx="1.5" fill="#F36A1D" opacity="0.55" />
      <rect x="0" y="11" width="7" height="5" rx="1.5" fill="#F36A1D" opacity="0.55" />
      <rect x="9" y="7" width="7" height="9" rx="1.5" fill="#F36A1D" opacity="0.8" />
    </svg>
  );
}

export function PoweredByCartogram({ tone = "auto", className }: { tone?: "auto" | "light"; className?: string }) {
  return (
    <a
      href="https://devcartogram.idtek.io/"
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-80", tone === "light" ? "text-white/45" : "text-fg-subtle", className)}
    >
      Powered by
      <CartogramMark />
      <span className={cn("font-display font-medium tracking-[-0.01em]", tone === "light" ? "text-white/80" : "text-fg-muted")}>Cartogram</span>
    </a>
  );
}
