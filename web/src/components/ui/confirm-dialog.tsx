"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Input } from "./form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Jika diisi, user harus mengetik teks ini persis sebelum bisa konfirmasi. */
  typeToConfirm?: string;
  onConfirm: () => void;
  children?: ReactNode;
};

/** Konfirmasi aksi berbahaya (hapus). */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Hapus", typeToConfirm, onConfirm, children }: Props) {
  const [typed, setTyped] = useState("");
  const ready = !typeToConfirm || typed === typeToConfirm;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped("");
        onOpenChange(o);
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button tone="danger" disabled={!ready} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {children}
        {typeToConfirm && (
          <Input label={`Ketik "${typeToConfirm}" untuk konfirmasi`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        )}
      </div>
    </Dialog>
  );
}
