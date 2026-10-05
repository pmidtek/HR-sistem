"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-provider";
import { Icon } from "@/components/ui/icon";

const toneIcon = { success: CircleCheck, danger: CircleAlert, neutral: Info };
const toneColor = { success: "text-fg-success", danger: "text-fg-danger", neutral: "text-fg-muted" };

export function Toaster() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-s bg-overlay px-4 py-3 shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-md)]"
        >
          <Icon icon={toneIcon[t.tone]} size={18} className={cn("mt-px", toneColor[t.tone])} />
          <p className="flex-1 text-sm text-fg">{t.title}</p>
          <button type="button" aria-label="Tutup" onClick={() => dismissToast(t.id)} className="text-fg-subtle hover:text-fg">
            <Icon icon={X} size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
