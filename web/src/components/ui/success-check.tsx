"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { EASE_STANDARD } from "./motion";

/** Centang bulat yang "pop" (scale) sebagai konfirmasi sukses. */
export function SuccessCheck({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <motion.span
      role="img"
      aria-label="Berhasil"
      className={cn("inline-flex items-center justify-center rounded-full bg-success-subtle text-fg-success", className)}
      style={{ width: size, height: size }}
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 14, mass: 0.7 }}
    >
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.2, ease: EASE_STANDARD }}
        className="inline-flex"
      >
        <Icon icon={Check} size={Math.round(size * 0.5)} />
      </motion.span>
    </motion.span>
  );
}
