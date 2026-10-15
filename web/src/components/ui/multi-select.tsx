"use client";

import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export type MultiOption = { value: string; label: string; hint?: string; color?: string; disabled?: boolean };

type Props = {
  options: MultiOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Elemen pemicu (tombol). */
  children: ReactNode;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  align?: "start" | "end";
};

/** Popover pilih banyak dengan pencarian (assignee, label, dependensi, peserta). */
export function MultiSelect({ options, value, onChange, children, searchPlaceholder = "Search…", emptyText = "No results.", disabled, align = "start" }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  if (disabled) return <>{children}</>;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={4}
          className="z-[60] w-64 overflow-hidden rounded-xs bg-overlay shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-md)] backdrop-blur-xl"
        >
          <Command>
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Icon icon={Search} size={14} className="text-fg-subtle" />
              <Command.Input placeholder={searchPlaceholder} className="h-9 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none" />
            </div>
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-5 text-center text-xs text-fg-muted">{emptyText}</Command.Empty>
              {options.map((o) => {
                const on = value.includes(o.value);
                return (
                  <Command.Item
                    key={o.value}
                    value={`${o.label} ${o.hint ?? ""}`}
                    disabled={o.disabled}
                    onSelect={() => toggle(o.value)}
                    className="flex cursor-pointer items-center gap-2 rounded-xs px-2.5 py-1.5 text-sm text-fg data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40 data-[selected=true]:bg-hover"
                  >
                    <span className={cn("flex size-4 items-center justify-center rounded-[3px] shadow-[inset_0_0_0_1px_var(--border-strong)]", on && "bg-brand shadow-none")}>
                      {on && <Icon icon={Check} size={12} className="text-fg-on-brand" />}
                    </span>
                    {o.color && <span className="size-2 rounded-full" style={{ background: o.color }} />}
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="text-xs text-fg-subtle">{o.hint}</span>}
                  </Command.Item>
                );
              })}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
