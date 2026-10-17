"use client";

import { Copy, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import type { ReimburseRowInput, RowErrors } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { isReceiptFile, nameClipboardFiles } from "@/lib/files";
import { formatNumber } from "@/lib/format";
import type { FileRef, ReimbursementCategory } from "@/lib/types";
import { CellCombobox } from "../ui/cell-combobox";
import type { ComboOption } from "../ui/combobox";
import { Icon } from "../ui/icon";
import { AttachDialog } from "./attach-dialog";
import { FileViewer } from "./file-viewer";

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
  /** Tanggal paling lama yang boleh (batas umur struk). */
  minDate: string;
  /** Pilihan kode project (bisa dicari; kode lain boleh diketik). */
  codeOptions: ComboOption[];
  onChange: (patch: Partial<SheetRow>) => void;
  onUsd: (text: string) => void;
  onEnter: (e: KeyboardEvent<HTMLElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  /** File dipilih → diupload (mode backend) lalu ditambahkan ke baris. */
  onAddFiles: (files: File[]) => void;
  /** File yang sudah tersimpan (dari pop-up lampiran) ditambahkan ke baris. */
  onAddRefs: (files: FileRef[]) => void;
  /** Sedang mengupload file untuk baris ini. */
  uploading: boolean;
  /** Keterangan kurs baris ini (tooltip kolom IDR). */
  rateHint?: string;
};

export function SheetRowCells({ row: r, index: i, errors: e, categories, today, minDate, codeOptions, onChange, onUsd, onEnter, onPaste, onDuplicate, onRemove, onAddFiles, onAddRefs, uploading, rateHint }: Props) {
  const n = i + 1;
  const [viewAt, setViewAt] = useState<number | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Paste gambar (screenshot) di mana pun pada baris ini → jadi lampiran baris ini.
  const pasteFiles = (ev: ClipboardEvent<HTMLElement>) => {
    const files = Array.from(ev.clipboardData.files).filter(isReceiptFile);
    if (files.length === 0) return;
    ev.preventDefault();
    onAddFiles(nameClipboardFiles(files));
  };
  const dropFiles = (ev: DragEvent<HTMLElement>) => {
    ev.preventDefault();
    setDragging(false);
    const files = Array.from(ev.dataTransfer.files).filter(isReceiptFile);
    if (files.length > 0) onAddFiles(files);
  };
  return (
    <tr className={cn("align-top", dragging && "bg-brand-subtle/40")} onPaste={pasteFiles}
      onDragOver={(ev) => { if (ev.dataTransfer.types.includes("Files")) { ev.preventDefault(); setDragging(true); } }}
      onDragLeave={(ev) => { if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={dropFiles}>
      <td className="bg-sunken px-2 py-2.5 text-center font-mono text-xs text-fg-subtle">{n}</td>
      <td className={cn("p-0", e.date && bad)} title={e.date}>
        <input type="date" min={minDate} max={today} value={r.date} onChange={(ev) => onChange({ date: ev.target.value })} onKeyDown={onEnter} className={cell} aria-label={`Date row ${n}`} />
      </td>
      <td className={cn("p-0", e.description && bad)} title={e.description}>
        <input value={r.description} placeholder="e.g. Whoosh train ticket" onChange={(ev) => onChange({ description: ev.target.value })} onKeyDown={onEnter} onPaste={onPaste} className={cell} aria-label={`Description row ${n}`} />
      </td>
      <td className={cn("p-0", e.categoryId && bad)} title={e.categoryId}>
        <CellCombobox
          aria-label={`Category row ${n}`}
          value={r.categoryId}
          onChange={(v) => onChange({ categoryId: v })}
          options={categories.filter((c) => c.active !== false || c.id === r.categoryId).map((c) => ({ value: c.id, label: c.name }))}
          searchPlaceholder="Search category…"
        />
      </td>
      <td className="p-0">
        <CellCombobox
          aria-label={`Code row ${n}`}
          value={r.codeText}
          onChange={(v) => onChange({ codeText: v })}
          options={codeOptions}
          placeholder="Optional"
          searchPlaceholder="Search or type a code…"
          creatable
          clearable
          normalize={(s) => s.trim().toUpperCase().replace(/\s+/g, "")}
          className="font-mono"
        />
      </td>
      <td className={cn("p-0", e.amountUsdCents && bad)} title={e.amountUsdCents}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-fg-subtle">$</span>
          <input inputMode="decimal" value={r.usdText} placeholder="-" onChange={(ev) => onUsd(ev.target.value)} onKeyDown={onEnter} className={cn(cell, "pl-6 text-right font-mono")} aria-label={`Cost USD row ${n}`} />
        </div>
      </td>
      <td className={cn("p-0", e.amount && bad)} title={e.amount ?? (r.idrAuto ? rateHint : undefined)}>
        <div className="relative">
          {r.idrAuto && r.amountUsdCents !== null && <span className="pointer-events-none absolute top-1 left-2 text-[9px] text-fg-subtle uppercase">rate</span>}
          <input
            inputMode="numeric"
            value={r.amount === 0 ? "" : formatNumber(r.amount)}
            placeholder="0"
            onChange={(ev) => onChange({ amount: Number(ev.target.value.replace(/\D/g, "")) || 0, idrAuto: false })}
            onKeyDown={onEnter}
            className={cn(cell, "text-right font-mono")}
            aria-label={`Cost IDR row ${n}`}
          />
        </div>
      </td>
      <td className={cn("px-2 py-1.5", e.files && bad)} title={e.files ?? "Upload, drag & drop, or click here and paste a screenshot (Cmd+V)"}>
        {/* tabIndex: klik sel ini lalu Cmd+V untuk menempel screenshot. */}
        <div tabIndex={0} aria-label={`Receipts row ${n}`} className="flex flex-wrap items-center gap-1 rounded-xxs outline-none focus:shadow-[inset_0_0_0_2px_var(--brand)]">
          {r.files.map((f, j) => (
            <span key={`${f.name}-${j}`} className="inline-flex max-w-full items-center gap-1 rounded-xxs bg-sunken px-1.5 py-0.5 text-[11px] text-fg-muted">
              <button type="button" className="max-w-24 truncate hover:text-fg-brand hover:underline" title={`Open ${f.name}`} onClick={() => setViewAt(j)}>{f.name}</button>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange({ files: r.files.filter((_, k) => k !== j) })} className="hover:text-fg">
                <Icon icon={X} size={11} />
              </button>
            </span>
          ))}
          {uploading ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] text-fg-muted"><Icon icon={Loader2} size={12} className="animate-spin" /> Uploading…</span>
          ) : (
            <button type="button" onClick={() => setAttachOpen(true)} className="inline-flex items-center gap-1 rounded-xxs px-1.5 py-1 text-[11px] text-fg-brand hover:bg-hover">
              <Icon icon={Paperclip} size={12} /> {r.files.length === 0 ? "Attach" : "Add"}
            </button>
          )}
        </div>
        {viewAt !== null && r.files[viewAt] && <FileViewer files={r.files} start={viewAt} onClose={() => setViewAt(null)} />}
        {attachOpen && (
          <AttachDialog
            kind="receipt"
            title={`Receipts · row ${n}`}
            description={r.description ? r.description : "Attach the receipt, invoice, or card statement for this expense."}
            files={r.files}
            onAdd={onAddRefs}
            onRemove={(k) => onChange({ files: r.files.filter((_, j) => j !== k) })}
            onClose={() => setAttachOpen(false)}
          />
        )}
      </td>
      <td className="px-1 py-1.5">
        <div className="flex">
          <button type="button" onClick={onDuplicate} aria-label={`Duplicate row ${n}`} title="Duplicate row" className="rounded-xxs p-1.5 text-fg-subtle hover:bg-hover hover:text-fg"><Icon icon={Copy} size={14} /></button>
          <button type="button" onClick={onRemove} aria-label={`Delete row ${n}`} title="Delete row" className="rounded-xxs p-1.5 text-fg-subtle hover:bg-hover hover:text-fg-danger"><Icon icon={Trash2} size={14} /></button>
        </div>
      </td>
    </tr>
  );
}
