"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { EASE_OUT } from "./motion";

const KEY = (id: string) => `section-open:${id}`;

function readOpen(id: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(KEY(id));
  return v === null ? fallback : v === "1";
}

type Props = {
  /** Kunci unik untuk mengingat buka/tutup di browser. */
  id: string;
  title: ReactNode;
  /** Ringkasan kecil di sebelah judul (tetap terlihat saat tertutup). */
  summary?: ReactNode;
  /** Kontrol di kanan judul (mis. filter); hanya tampil saat terbuka. */
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

/** Bagian halaman yang bisa dibuka/tutup supaya halaman tidak terlalu ramai. */
export function CollapsibleSection({ id, title, summary, actions, defaultOpen = true, children, className }: Props) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));
  const contentId = useId();

  function toggle() {
    setOpen((o) => {
      window.localStorage.setItem(KEY(id), o ? "0" : "1");
      return !o;
    });
  }

  return (
    <section className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls={contentId} className="group flex min-w-0 items-center gap-2 text-left">
          <Icon icon={ChevronDown} size={16} className={cn("text-fg-subtle transition-transform duration-200 group-hover:text-fg", !open && "-rotate-90")} />
          <h2 className="font-display text-base font-medium text-fg">{title}</h2>
          {summary && <span className="truncate text-xs text-fg-subtle">{summary}</span>}
        </button>
        {open && actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
