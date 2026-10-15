"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-provider";
import { Icon } from "@/components/ui/icon";
import { DURATION, EASE_STANDARD } from "@/components/ui/motion";

const toneIcon = { success: CircleCheck, danger: CircleAlert, neutral: Info };
const toneColor = { success: "text-fg-success", danger: "text-fg-danger", neutral: "text-fg-muted" };

export function Toaster() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            role="status"
            initial={{ opacity: 0, x: 48, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, transition: { duration: DURATION.base, ease: EASE_STANDARD } }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="pointer-events-auto flex items-start gap-3 rounded-s bg-overlay backdrop-blur-xl px-4 py-3 shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-md)]"
          >
            <motion.span
              className={cn("mt-px inline-flex", toneColor[t.tone])}
              initial={t.tone === "success" ? { scale: 0.5 } : false}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 20, mass: 0.6 }}
            >
              <Icon icon={toneIcon[t.tone]} size={18} />
            </motion.span>
            <p className="flex-1 text-sm text-fg">{t.title}</p>
            <button type="button" aria-label="Close" onClick={() => dismissToast(t.id)} className="text-fg-subtle hover:text-fg">
              <Icon icon={X} size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
