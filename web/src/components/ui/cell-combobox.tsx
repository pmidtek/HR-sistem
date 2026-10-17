"use client";

import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ComboOption } from "./combobox";
import { Icon } from "./icon";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Boleh mengetik nilai di luar daftar (mis. kode project baru). `normalize` merapikan teks ketikan. */
  creatable?: boolean;
  normalize?: (raw: string) => string;
  /** Tampilkan pilihan "Clear" saat ada nilai. */
  clearable?: boolean;
  className?: string;
  "aria-label": string;
};

/**
 * Dropdown yang bisa dicari, bentuknya menyatu dengan sel tabel (lembar input reimburse).
 * Ketik untuk mencari; Enter memilih; Esc menutup.
 */
export function CellCombobox({ value, onChange, options, placeholder = "Select…", searchPlaceholder = "Search…", creatable, normalize = (s) => s.trim(), clearable, className, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const typed = normalize(query);
  const exists = options.some((o) => o.value.toLowerCase() === typed.toLowerCase());
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={rest["aria-label"]}
          className={cn(
            "group flex h-10 w-full items-center justify-between gap-1.5 bg-transparent px-3 text-left text-sm outline-none transition-colors hover:bg-hover focus-visible:shadow-[inset_0_0_0_2px_var(--brand)]",
            open && "bg-hover shadow-[inset_0_0_0_2px_var(--brand)]",
            className,
          )}
        >
          <span className={cn("truncate", value ? "text-fg" : "text-fg-subtle")}>{selected?.label ?? (value || placeholder)}</span>
          <Icon icon={ChevronDown} size={14} className={cn("shrink-0 text-fg-subtle transition-transform", open && "rotate-180 text-fg-brand")} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[max(var(--radix-popover-trigger-width),16rem)] overflow-hidden rounded-s bg-overlay p-1.5 backdrop-blur-xl shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-lg)]"
        >
          <Command loop>
            <div className="mb-1 flex items-center gap-2 rounded-xs bg-sunken px-2.5 shadow-[inset_0_0_0_1px_var(--border-default)] focus-within:shadow-[inset_0_0_0_1px_var(--brand)]">
              <Icon icon={Search} size={14} className="shrink-0 text-fg-subtle" />
              <Command.Input
                data-no-ring
                value={query}
                onValueChange={setQuery}
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-sm text-fg shadow-none outline-none placeholder:text-fg-subtle focus:shadow-none focus:outline-none focus-visible:shadow-none"
              />
            </div>
            <Command.List className="max-h-64 overflow-y-auto overscroll-contain">
              {!(creatable && typed && !exists) && <Command.Empty className="px-3 py-5 text-center text-xs text-fg-muted">No results.</Command.Empty>}
              {creatable && typed && !exists && (
                <Command.Item forceMount value={`__create ${typed}`} onSelect={() => pick(typed)} className="flex cursor-pointer items-center gap-2 rounded-xxs px-2.5 py-2 text-sm text-fg-brand data-[selected=true]:bg-hover">
                  <Icon icon={Plus} size={14} /> Use &ldquo;<span className="font-mono">{typed}</span>&rdquo;
                </Command.Item>
              )}
              {options.map((o) => (
                <Command.Item
                  key={o.value}
                  value={`${o.value} ${o.label} ${o.hint ?? ""}`}
                  onSelect={() => pick(o.value)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xxs px-2.5 py-2 text-sm text-fg data-[selected=true]:bg-hover",
                    o.value === value && "bg-brand-subtle/50 text-fg-brand",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="max-w-[50%] truncate text-xs text-fg-subtle">{o.hint}</span>}
                  <Icon icon={Check} size={14} className={cn("shrink-0", o.value === value ? "text-fg-brand" : "opacity-0")} />
                </Command.Item>
              ))}
              {clearable && value && (
                <Command.Item value="__clear" onSelect={() => pick("")} className="mt-1 flex cursor-pointer items-center gap-2 rounded-xxs border-t border-line px-2.5 py-2 text-sm text-fg-muted data-[selected=true]:bg-hover">
                  <Icon icon={X} size={14} /> Clear
                </Command.Item>
              )}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
