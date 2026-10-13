"use client";

import { motion } from "motion/react";
import { useCallback, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "./motion";

/** Hanya warna dari ramp Cartogram (brand + neutral hangat). */
const COLORS = [
  "var(--color-brand-brand-300)",
  "var(--color-brand-brand-500)",
  "var(--color-brand-brand-700)",
  "var(--color-brand-brand-200)",
  "var(--color-neutral-400)",
];

type Piece = { id: number; x: number; y: number; rotate: number; color: string; w: number; h: number; delay: number };

let burstSeq = 0;

function makePieces(count: number): Piece[] {
  burstSeq += 1;
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const dist = 90 + Math.random() * 90;
    return {
      id: burstSeq * 1000 + i,
      x: Math.cos(angle) * dist,
      // Sedikit condong ke atas, lalu turun karena "gravitasi" di keyframe terakhir.
      y: Math.sin(angle) * dist * 0.7 - 40,
      rotate: (Math.random() - 0.5) * 540,
      color: COLORS[i % COLORS.length],
      w: 6 + Math.random() * 4,
      h: 3 + Math.random() * 3,
      delay: Math.random() * 0.06,
    };
  });
}

/**
 * Confetti kecil buatan sendiri (tanpa library). Pakai: const { fire, node } = useConfetti();
 * panggil fire() lalu render {node}. Tidak muncul jika prefers-reduced-motion aktif.
 */
export function useConfetti(count = 24): { fire: () => void; node: ReactNode } {
  const reduce = usePrefersReducedMotion();
  const [pieces, setPieces] = useState<Piece[]>([]);

  const fire = useCallback(() => {
    if (reduce) return;
    setPieces(makePieces(count));
    window.setTimeout(() => setPieces([]), 1100);
  }, [count, reduce]);

  const node =
    pieces.length === 0 ? null : (
      <div aria-hidden className="pointer-events-none fixed top-[38%] left-1/2 z-[70] size-0">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-[1px]"
            style={{ width: p.w, height: p.h, background: p.color }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.6 }}
            animate={{ x: [0, p.x, p.x * 1.08], y: [0, p.y, p.y + 120], rotate: p.rotate, opacity: [1, 1, 0], scale: 1 }}
            transition={{ duration: 0.9, delay: p.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
          />
        ))}
      </div>
    );

  return { fire, node };
}
