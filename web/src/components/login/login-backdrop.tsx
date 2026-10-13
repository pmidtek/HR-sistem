"use client";

import { motion } from "motion/react";

/**
 * Cahaya brand yang bergerak sangat pelan di belakang halaman login.
 * Hanya transform (x, y, scale) yang dianimasikan; warna dari token --brand.
 * Diam jika prefers-reduced-motion aktif (lewat skipAnimations di MotionProvider).
 */
const blobs = [
  { className: "top-[-18%] left-[-12%] size-[620px] opacity-30", x: [0, 60, -20, 0], y: [0, 40, 80, 0], duration: 22 },
  { className: "bottom-[-22%] left-[22%] size-[520px] opacity-20", x: [0, -50, 30, 0], y: [0, -30, 20, 0], duration: 26 },
  { className: "top-[10%] right-[-14%] size-[460px] opacity-[0.14]", x: [0, -40, 10, 0], y: [0, 50, -20, 0], duration: 30 },
];

export function LoginBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[80px] ${b.className}`}
          style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 68%)" }}
          animate={{ x: b.x, y: b.y, scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: b.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
