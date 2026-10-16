"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";

/**
 * Ilustrasi kecil di halaman login: timesheet seminggu yang terisi lalu disetujui, dengan kartu reimburse di belakang.
 * Kartu bergaya kaca di atas latar gradasi. Diam jika prefers-reduced-motion aktif (lewat MotionProvider).
 */
const days = [
  { d: "Mon", h: 0.6 },
  { d: "Tue", h: 0.75 },
  { d: "Wed", h: 0.5 },
  { d: "Thu", h: 0.7 },
  { d: "Fri", h: 0.55 },
];
const loop = { repeat: Infinity, repeatDelay: 3, duration: 0.7, ease: "easeOut" } as const;
const glass = "bg-white/[0.07] backdrop-blur-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),inset_0_1px_0_rgba(255,255,255,0.12),0_24px_48px_-16px_rgba(0,0,0,0.6)]";

export function LoginIllustration() {
  return (
    <div aria-hidden className="relative h-56 w-80 text-left">
      {/* Kartu reimburse di belakang */}
      <motion.div
        className={`absolute top-0 right-0 w-44 rounded-s p-3 ${glass}`}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <p className="text-[10px] text-white/55">Reimburse</p>
        <p className="mt-1 font-display text-sm text-white">Rp1.796.944</p>
        <div className="mt-2 h-1 w-3/4 rounded-full bg-white/15" />
        <div className="mt-1.5 h-1 w-1/2 rounded-full bg-white/15" />
      </motion.div>

      {/* Kartu timesheet utama */}
      <div className={`absolute bottom-0 left-0 w-64 rounded-m p-4 ${glass}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/80">This week&apos;s timesheet</p>
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-white/50">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <motion.line
              x1="8" y1="8" x2="8" y2="4"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
              style={{ transformBox: "view-box", transformOrigin: "8px 8px" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
          </svg>
        </div>

        <div className="mt-4 flex h-16 items-end gap-3">
          {days.map((x, i) => (
            <div key={x.d} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-12 w-full items-end">
                <motion.div
                  className="w-full rounded-[3px] bg-brand"
                  style={{ height: `${x.h * 100}%`, originY: 1 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ ...loop, delay: i * 0.12 }}
                />
              </div>
              <span className="text-[9px] text-white/45">{x.d}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-[11px] text-white/60">Total 40 h</span>
          <motion.span
            className="flex items-center gap-1 rounded-full bg-[#1e3a2a]/80 px-2 py-0.5 text-[10px] text-[#7fd6a1]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...loop, duration: 0.35, delay: 1 }}
          >
            <Check size={10} strokeWidth={2.5} /> Approved
          </motion.span>
        </div>
      </div>
    </div>
  );
}
