"use client";

import { cn } from "@/lib/cn";

export type TabItem<T extends string> = { value: T; label: string; count?: number };

type TabsProps<T extends string> = {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "line" | "pill";
};

export function Tabs<T extends string>({ tabs, value, onChange, variant = "line" }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 overflow-x-auto",
        variant === "line" && "border-b border-line",
        variant === "pill" && "w-fit rounded-pill bg-sunken p-1 shadow-[inset_0_0_0_1px_var(--border-default)]",
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex items-center gap-2 text-sm whitespace-nowrap transition-colors duration-[120ms]",
              variant === "line" && "-mb-px h-10 border-b-[1.5px] px-3",
              variant === "line" && (active ? "border-brand text-fg" : "border-transparent text-fg-muted hover:text-fg"),
              variant === "pill" && "h-8 rounded-pill px-3.5",
              variant === "pill" && (active ? "bg-raised text-fg shadow-xs" : "text-fg-muted hover:text-fg"),
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "rounded-xxs px-1.5 font-mono text-[11px]",
                  active ? "bg-brand-subtle text-fg-brand" : "bg-hover text-fg-subtle",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
