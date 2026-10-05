"use client";

import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/display";

type Props = {
  title: string;
  description?: string;
  readOnly: boolean;
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
  children: ReactNode;
};

export function SettingsSection({ title, description, readOnly, dirty, onSave, onReset, children }: Props) {
  return (
    <Card padding="lg" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
        </div>
        {readOnly ? (
          <span className="text-xs text-fg-subtle">Hanya lihat</span>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" tone="neutral" size="small" disabled={!dirty} onClick={onReset}>Batalkan</Button>
            <Button size="small" disabled={!dirty} onClick={onSave}>Simpan perubahan</Button>
          </div>
        )}
      </div>
      <fieldset disabled={readOnly} className="flex flex-col gap-6">{children}</fieldset>
    </Card>
  );
}

/** Konversi basis poin ↔ teks persen ("1,5"). */
export const bpsToPct = (bps: number) => (bps / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 });
export const pctToBps = (txt: string) => Math.round(Number(txt.replace(",", ".")) * 100) || 0;
export const parseRp = (txt: string) => Number(txt.replace(/\D/g, "")) || 0;
