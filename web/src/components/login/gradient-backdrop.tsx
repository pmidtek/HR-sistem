"use client";

import dynamic from "next/dynamic";

/**
 * Latar halaman login: mesh gradient WebGL yang terus mengalir (gelap + oranye brand).
 * Canvas di-load lazy tanpa SSR; selama memuat (atau jika WebGL tidak ada) tampil gradasi CSS statis yang mirip.
 * prefers-reduced-motion → speed 0 (diam). Vignette tipis supaya teks putih tetap terbaca.
 */
const MeshCanvas = dynamic(() => import("./mesh-canvas"), { ssr: false });

export function GradientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0d0907]">
      <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_70%_40%,#c2622d_0%,#3a1a0c_55%,transparent_80%),radial-gradient(50%_50%_at_20%_90%,#e8743b55,transparent)]" />
      <MeshCanvas />
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,rgba(13,9,7,0.15),rgba(13,9,7,0.65))]" />
    </div>
  );
}
