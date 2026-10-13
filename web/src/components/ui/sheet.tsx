"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { IconButton } from "./button";
import { Icon } from "./icon";
import { EASE_OUT } from "./motion";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Judul untuk pembaca layar (judul visual ada di `header`). */
  title: string;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/** Panel detail dari kanan (mis. detail task). Lebar penuh di layar kecil. */
export function Sheet({ open, onOpenChange, title, header, children, footer }: SheetProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <RadixDialog.Content asChild aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
          <motion.div
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[720px] flex-col bg-overlay shadow-[inset_1px_0_0_var(--border-strong),var(--shadow-lg)] backdrop-blur-2xl"
          >
            <div className="flex items-start gap-3 border-b border-line px-6 py-4">
              <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
              <div className="min-w-0 flex-1">{header}</div>
              <RadixDialog.Close asChild>
                <IconButton label="Tutup" size="small">
                  <Icon icon={X} />
                </IconButton>
              </RadixDialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex items-center gap-2 border-t border-line px-6 py-3">{footer}</div>}
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
