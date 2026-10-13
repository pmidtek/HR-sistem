"use client";

import * as Popover from "@radix-ui/react-popover";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";
import { Icon } from "./icon";

export type MenuItem = { label: string; onSelect: () => void; icon?: LucideIcon; danger?: boolean; hidden?: boolean };

/** Menu titik tiga (⋯) sederhana. */
export function Menu({ items, label = "Menu", align = "end" }: { items: MenuItem[]; label?: string; align?: "start" | "end" }) {
  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton label={label} size="small">
          <Icon icon={MoreHorizontal} />
        </IconButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align={align} sideOffset={4} className="z-[60] min-w-44 rounded-xs bg-overlay p-1 shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-md)] backdrop-blur-xl">
          {visible.map((item) => (
            <Popover.Close asChild key={item.label}>
              <button
                type="button"
                onClick={item.onSelect}
                className={cn("flex w-full items-center gap-2 rounded-xs px-3 py-2 text-left text-sm hover:bg-hover", item.danger ? "text-fg-danger" : "text-fg")}
              >
                {item.icon && <Icon icon={item.icon} size={14} />}
                {item.label}
              </button>
            </Popover.Close>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
