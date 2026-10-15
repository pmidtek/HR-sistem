"use client";

import { Copy, Paperclip, Trash2, X } from "lucide-react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import type { ReimburseRowInput, RowErrors } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { ReimbursementCategory } from "@/lib/types";
import { Icon } from "../ui/icon";

/** Baris lembar input: data + teks mentah untuk kolom USD/kode supaya mengetik terasa natural. */
export type SheetRow = ReimburseRowInput & { key: number; usdText: string; codeText: string; idrAuto: boolean };

export const cell = "h-10 w-full bg-transparent px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:shadow-[inset_0_0_0_2px_var(--brand)]";
const bad = "bg-danger-subtle";

type Props = {
  row: SheetRow;
  index: number;
  errors: RowErrors;
  categories: ReimbursementCategory[];
  today: string;
  codeListId: string;
  onChange: (patch: Partial<SheetRow>) => void;
  onUsd: (text: string) => void;
  onEnter: (e: KeyboardEvent<HTMLElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function SheetRowCells({ row: r, index: i, errors: e, categories, today, codeListId, onChange, onUsd, onEnter, onPaste, onDuplicate, onRemove }: Props) {
  const n = i + 1;
  return (
    <tr className="align-top">
      <td className="bg-sunken px-2 py-2.5 text-center font-mono text-xs text-fg-subtle">{n}</td>
      <td className={cn("p-0", e.date && bad)} title={e.date}>
        <input type="date" max={today} value={r.date} onChange={(ev) => onChange({ date: ev.target.value })} onKeyDown={onEnter} className={cell} aria-label={`Date baris ${n}`} />
      </td>
      <td className={cn("p-0", e.description && bad)} title={e.description}>
        <input value={r.description} placeholder="Mis. Tiket Whoosh pergi" onChange={(ev) => onChange({ description: ev.target.value })} onKeyDown={onEnter} onPaste={onPaste} className={cell} aria-label={`Description baris ${n}`} />
      </td>
      <td className={cn("p-0", e.categoryId && bad)} title={e.categoryId}>
        <select value={r.categoryId} onChange={(ev) => onChange({ categoryId: ev.target.value })} className={cn(cell, !r.categoryId && "text-fg-subtle")} aria-label={`Category baris ${n}`}>
          <option value="">Pilih…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td className="p-0">
        <input value={r.codeText} list={codeListId} placeholder="Opsional" onChange={(ev) => onChange({ codeText: ev.target.value.toUpperCase() })} onKeyDown={onEnter} className={cn(cell, "font-mono uppercase placeholder:font-sans placeholder:normal-case")} aria-label={`Code baris ${n}`} />
      </td>
      <td className={cn("p-0", e.amountUsdCents && bad)} title={e.amountUsdCents}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-fg-subtle">$</span>
          <input inputMode="decimal" value={r.usdText} placeholder="-" onChange={(ev) => onUsd(ev.target.value)} onKeyDown={onEnter} className={cn(cell, "pl-6 text-right font-mono")} aria-label={`Cost USD baris ${n}`} />
        </div>
      </td>
      <td className={cn("p-0", e.amount && bad)} title={e.amount}>
        <div className="relative">
          {r.idrAuto && r.amountUsdCents !== null && <span className="pointer-events-none absolute top-1 left-2 text-[9px] text-fg-subtle uppercase">kurs</span>}
          <input
            inputMode="numeric"
            value={r.amount === 0 ? "" : formatNumber(r.amount)}
            placeholder="0"
            onChange={(ev) => onChange({ amount: Number(ev.target.value.replace(/\D/g, "")) || 0, idrAuto: false })}
            onKeyDown={onEnter}
            className={cn(cell, "text-right font-mono")}
            aria-label={`Cost IDR baris ${n}`}
          />
        </div>
      </td>
      <td className={cn("px-2 py-1.5", e.files && bad)} title={e.files}>
        <div className="flex flex-wrap items-center gap-1">
          {r.files.map((f, j) => (
            <span key={`${f}-${j}`} className="inline-flex max-w-full items-center gap-1 rounded-xxs bg-sunken px-1.5 py-0.5 text-[11px] text-fg-muted">
              <span className="max-w-24 truncate" title={f}>{f}</span>
              <button type="button" aria-label={`Hapus ${f}`} onClick={() => onChange({ files: r.files.filter((_, k) => k !== j) })} className="hover:text-fg">
                <Icon icon={X} size={11} />
              </button>
            </span>
          ))}
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-xxs px-1.5 py-1 text-[11px] text-fg-brand hover:bg-hover">
            <Icon icon={Paperclip} size={12} /> {r.files.length === 0 ? "Upload" : "Tambah"}
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(ev) => {
                onChange({ files: [...r.files, ...Array.from(ev.target.files ?? []).map((x) => x.name)] });
                ev.target.value = "";
              }}
            />
          </label>
        </div>
      </td>
      <td className="px-1 py-1.5">
        <div className="flex">
          <button type="button" onClick={onDuplicate} aria-label={`Duplikat baris ${n}`} title="Duplikat baris" className="rounded-xxs p-1.5 text-fg-subtle hover:bg-hover hover:text-fg"><Icon icon={Copy} size={14} /></button>
          <button type="button" onClick={onRemove} aria-label={`Hapus baris ${n}`} title="Hapus baris" className="rounded-xxs p-1.5 text-fg-subtle hover:bg-hover hover:text-fg-danger"><Icon icon={Trash2} size={14} /></button>
        </div>
      </td>
    </tr>
  );
}
