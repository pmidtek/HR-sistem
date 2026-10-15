import { cn } from "@/lib/cn";

/**
 * Logo sementara (dibuat dari teks + bentuk sederhana) sampai file logo resmi IDTEK & Cartogram tersedia.
 * Untuk mengganti: taruh SVG resmi di public/brand/ lalu ubah komponen ini menjadi <img>.
 */

export function IdtekMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <rect x="8" y="8" width="4" height="16" rx="1.5" fill="#fff" />
      <path d="M15 8h4.5a8 8 0 0 1 0 16H15z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

/** Logo aplikasi "idtek dashboard". `tone="light"` untuk latar gelap. */
export function IdtekLogo({ tone = "auto", className }: { tone?: "auto" | "light"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <IdtekMark />
      <span className={cn("font-mono text-[15px] font-semibold tracking-[-0.02em]", tone === "light" ? "text-white" : "text-fg")}>
        idtek <span className={cn("font-normal", tone === "light" ? "text-white/55" : "text-fg-muted")}>dashboard</span>
      </span>
    </span>
  );
}

/** Tanda Cartogram: petak-petak seperti peta kartogram. */
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
      href="https://cartogram.ai"
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
