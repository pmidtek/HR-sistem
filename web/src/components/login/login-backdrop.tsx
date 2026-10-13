"use client";

import { motion } from "motion/react";

/**
 * Cahaya brand yang bergerak sangat pelan di belakang halaman login.
 * Hanya transform (x, y, scale) yang dianimasikan; warna dari token --brand.
 * Diam jika prefers-reduced-motion aktif (lewat skipAnimations di MotionProvider).
 */
const blobs = [
  { className: "top-[-18%] left-[-12%] size-[680px] opacity-45", x: [0, 120, -40, 0], y: [0, 80, 140, 0], duration: 16 },
  { className: "bottom-[-22%] left-[22%] size-[560px] opacity-30", x: [0, -110, 60, 0], y: [0, -70, 40, 0], duration: 19 },
  { className: "top-[10%] right-[-14%] size-[500px] opacity-25", x: [0, -90, 30, 0], y: [0, 100, -40, 0], duration: 22 },
];

export function LoginBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[80px] ${b.className}`}
          style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 68%)" }}
          animate={{ x: b.x, y: b.y, scale: [1, 1.15, 0.92, 1] }}
          transition={{ duration: b.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
