"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useState } from "react";
import { usePrefersReducedMotion } from "../ui/motion";

/** Palet gelap + oranye brand (urutan: dasar gelap → highlight). */
export const MESH_COLORS = ["#0d0907", "#3a1a0c", "#c2622d", "#e8743b", "#f4a261"];

/** Batas resolusi: setara devicePixelRatio maks 1.5 untuk layar penuh. */
const MAX_DPR = 1.5;

/**
 * Mesh gradient WebGL (paper-design). Di-load lazy dari GradientBackdrop.
 * Library sudah menjeda render saat tab tidak aktif (visibilitychange).
 */
export default function MeshCanvas() {
  const reduce = usePrefersReducedMotion();
  const [maxPixelCount] = useState(() => Math.round(window.screen.width * window.screen.height * MAX_DPR * MAX_DPR));
  return (
    <MeshGradient
      className="absolute inset-0 h-full w-full"
      colors={MESH_COLORS}
      distortion={0.8}
      swirl={0.45}
      grainMixer={0}
      grainOverlay={0.04}
      speed={reduce ? 0 : 0.4}
      minPixelRatio={1}
      maxPixelCount={maxPixelCount}
    />
  );
}
