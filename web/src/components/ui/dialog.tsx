"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";
import { Icon } from "./icon";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg";
};

export function Dialog({ open, onOpenChange, title, description, children, footer, width = "md" }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <RadixDialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-l bg-overlay shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-lg)]",
            width === "md" ? "max-w-lg" : "max-w-3xl",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <RadixDialog.Title className="font-display text-lg font-medium text-fg">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-0.5 text-sm text-fg-muted">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Tutup" size="small">
                <Icon icon={X} />
              </IconButton>
            </RadixDialog.Close>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
