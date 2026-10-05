"use client";

import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Field } from "./form";
import { Icon } from "./icon";

export type ComboOption = { value: string; label: string; hint?: string };

type ComboboxProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
};

/** Picker searchable untuk daftar yang terus bertambah (pegawai, project, company). */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  error,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const selected = options.find((o) => o.value === value);

  return (
    <Field label={label} error={error} id={id}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-xxs bg-sunken px-3 text-left text-sm",
              "shadow-[inset_0_0_0_1px_var(--border-default)] hover:shadow-[inset_0_0_0_1px_var(--border-strong)]",
              open && "shadow-[inset_0_0_0_1px_var(--brand)]",
              error && "shadow-[inset_0_0_0_1px_var(--danger)]",
            )}
          >
            <span className={cn("truncate", selected ? "text-fg" : "text-fg-subtle")}>
              {selected ? selected.label : placeholder}
            </span>
            <Icon icon={ChevronsUpDown} size={14} className="text-fg-subtle" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="z-50 w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden rounded-xs bg-overlay shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-md)]"
          >
            <Command>
              <div className="flex items-center gap-2 border-b border-line px-3">
                <Icon icon={Search} size={14} className="text-fg-subtle" />
                <Command.Input
                  placeholder={searchPlaceholder}
                  className="h-10 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
                />
              </div>
              <Command.List className="max-h-64 overflow-y-auto p-1">
                <Command.Empty className="px-3 py-6 text-center text-xs text-fg-muted">Tidak ditemukan.</Command.Empty>
                {options.map((o) => (
                  <Command.Item
                    key={o.value}
                    value={`${o.label} ${o.hint ?? ""}`}
                    onSelect={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-xs px-2.5 py-2 text-sm text-fg data-[selected=true]:bg-hover"
                  >
                    <Icon
                      icon={Check}
                      size={14}
                      className={cn(o.value === value ? "text-fg-brand" : "opacity-0")}
                    />
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="text-xs text-fg-subtle">{o.hint}</span>}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </Field>
  );
}
