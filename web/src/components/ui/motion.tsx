"use client";

import {
  animate,
  motion,
  MotionConfig,
  useMotionValue,
  useIsomorphicLayoutEffect,
  useReducedMotion,
  useTransform,
  type Transition,
  type Variants,
} from "motion/react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Helper animasi bersama. Aturan:
 * - Elemen masuk pakai pegas / --ease-out; count-up 1,2 dtk & bar 0,9 dtk supaya terasa.
 *   Interaksi kecil (hover, tekan, toast keluar) tetap cepat dengan --ease-standard.
 * - Hanya transform & opacity.
 * - prefers-reduced-motion aktif → tanpa animasi (langsung ke keadaan akhir), diatur
 *   terpusat oleh MotionProvider. Jangan ubah `initial` berdasarkan preferensi ini.
 */

/** Sama dengan --ease-standard: cubic-bezier(0.2, 0, 0, 1). */
export const EASE_STANDARD = [0.2, 0, 0, 1] as const;
/** Sama dengan --ease-out: cubic-bezier(0.16, 1, 0.3, 1), untuk elemen yang masuk. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** Pegas untuk item yang muncul: sedikit "hidup" tanpa memantul berlebihan. */
export const ENTER_SPRING: Transition = { type: "spring", stiffness: 260, damping: 24, mass: 0.9 };
export const DURATION = { fast: 0.15, base: 0.2, slow: 0.32, max: 0.4 } as const;
export const baseTransition: Transition = { duration: DURATION.slow, ease: EASE_STANDARD };

/** Batas item yang dianimasikan dalam daftar; sisanya tampil langsung. */
export const STAGGER_LIMIT = 10;

/**
 * prefers-reduced-motion → skipAnimations: semua animasi langsung ke nilai akhir.
 * Dipakai di sini (bukan dengan mengubah `initial`) supaya HTML server dan client sama (tanpa hydration mismatch).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduce = usePrefersReducedMotion();
  return (
    <MotionConfig reducedMotion="user" skipAnimations={reduce} transition={baseTransition}>
      {children}
    </MotionConfig>
  );
}

/** true jika user meminta gerakan dikurangi (null saat belum diketahui dianggap false). */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

type FadeInProps = { children: ReactNode; className?: string; delay?: number; y?: number };

/** Muncul dengan fade + geser naik tipis. */
export function FadeIn({ children, className, delay = 0, y = 16 }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...baseTransition, delay }}
    >
      {children}
    </motion.div>
  );
}

function containerVariants(delay: number): Variants {
  return { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: delay } } };
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: ENTER_SPRING },
};

const containers = { div: motion.div, section: motion.section, tbody: motion.tbody, ul: motion.ul };
const items = { div: motion.div, tr: motion.tr, li: motion.li, section: motion.section };

type StaggerProps = {
  children: ReactNode;
  className?: string;
  as?: keyof typeof containers;
  /** Jeda (detik) sebelum item pertama muncul; untuk mengurutkan beberapa section. */
  delay?: number;
};

/** Wadah daftar: anak-anak StaggerItem muncul berurutan. */
export function Stagger({ children, className, as = "div", delay = 0 }: StaggerProps) {
  const Comp = containers[as];
  return (
    <Comp className={className} variants={containerVariants(delay)} initial="hidden" animate="show">
      {children}
    </Comp>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
  /** Urutan item; hanya STAGGER_LIMIT item pertama yang dianimasikan. */
  index?: number;
  as?: keyof typeof items;
  onClick?: () => void;
};

export function StaggerItem({ children, className, index = 0, as = "div", onClick }: StaggerItemProps) {
  const Comp = items[as];
  return (
    <Comp className={className} variants={index < STAGGER_LIMIT ? itemVariants : undefined} onClick={onClick}>
      {children}
    </Comp>
  );
}

/** Bar yang tumbuh dari kiri (scaleX, bukan width). */
export function GrowBar({ ratio, className }: { ratio: number; className?: string }) {
  const scale = Math.max(0, Math.min(1, ratio));
  return (
    <motion.span
      className={className}
      style={{ originX: 0, display: "block" }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: scale }}
      transition={{ duration: 0.9, delay: 0.15, ease: EASE_OUT }}
    />
  );
}

/** Transisi antar halaman: fade + geser 20px. Hanya animasi masuk (exit di App Router tidak stabil). */
export function PageTransition({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <motion.div
      key={id}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Count-up: sekali per sesi browser per halaman ---------- */

const CountUpContext = createContext(false);

function readOnce(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(key) === null;
  } catch {
    return false;
  }
}

/**
 * Bungkus satu halaman. Count-up di dalamnya hanya berjalan saat halaman ini
 * pertama kali dibuka dalam sesi browser (sessionStorage), bukan tiap kembali.
 */
export function CountUpScope({ id, children }: { id: string; children: ReactNode }) {
  const key = `countup:${id}`;
  const [firstVisit] = useState(() => readOnce(key));
  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage tidak tersedia (mode privat ketat): abaikan.
    }
  }, [key]);
  return <CountUpContext.Provider value={firstVisit}>{children}</CountUpContext.Provider>;
}

type CountUpProps = { value: number; format?: (n: number) => string; className?: string };

/** Angka yang menghitung naik dari 0. Lebar angka tetap (tabular-nums) supaya layout tidak bergeser. */
export function CountUp({ value, format = (n) => String(n), className }: CountUpProps) {
  const allowed = useContext(CountUpContext);
  const reduce = usePrefersReducedMotion();
  const shouldAnimate = allowed && !reduce;
  // Render awal selalu nilai akhir (aman untuk SSR); reset ke 0 sebelum paint jika perlu animasi.
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(Math.round(v)));
  // Selesai = tidak pernah dianimasikan lagi (re-render / perubahan data cukup set nilai akhir).
  const done = useRef(!shouldAnimate);

  useIsomorphicLayoutEffect(() => {
    if (done.current) {
      mv.set(value);
      return;
    }
    mv.set(0);
    const controls = animate(mv, value, { duration: 1.2, ease: EASE_OUT });
    controls.then(() => {
      done.current = true;
    });
    return () => controls.stop();
  }, [mv, value]);

  return <motion.span className={`tabular-nums ${className ?? ""}`}>{text}</motion.span>;
}
