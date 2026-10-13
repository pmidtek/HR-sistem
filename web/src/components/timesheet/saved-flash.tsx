"use client";

import { motion } from "motion/react";
import { EASE_STANDARD } from "../ui/motion";
import { SuccessCheck } from "../ui/success-check";

/** Entri yang baru disimpan; `at` membuat animasi bisa diputar ulang saat disimpan lagi. */
export type SavedMark = { id: string; at: number };

/**
 * Tanda sukses kecil di atas kartu entri yang baru disimpan:
 * garis brand + centang pop, muncul 150ms, tahan sebentar, lalu pudar 300ms.
 * Induknya harus `relative` (atau `absolute`). `checkInside` untuk induk yang overflow-hidden.
 */
export function SavedFlash({ checkInside = false }: { checkInside?: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1.5px_var(--brand)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.1, times: [0, 0.14, 0.73, 1], ease: EASE_STANDARD }}
    >
      <span className={checkInside ? "absolute top-1.5 right-1.5" : "absolute -top-1.5 -right-1.5"}>
        <SuccessCheck size={18} />
      </span>
    </motion.span>
  );
}
