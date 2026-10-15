"use client";

import { RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate, formatRupiah } from "@/lib/format";
import type { ReimbursementItem } from "@/lib/types";
import { useApp } from "@/store/app-provider";
import { useLookups } from "../hooks";
import { FileChips } from "./file-viewer";
import { formatUsd, ProjectCode } from "./parts";

type Props = {
  items: ReimbursementItem[];
  /** Jika diisi, peninjau bisa menolak/memulihkan baris. */
  onDecline?: (item: ReimbursementItem) => void;
  onRestore?: (item: ReimbursementItem) => void;
};

/** Rincian baris pengajuan, dengan alasan untuk baris yang ditolak. */
export function ClaimItems({ items, onDecline, onRestore }: Props) {
  const { state } = useApp();
  const { userName } = useLookups();
  const categoryName = (id: string) => state.reimbursementCategories.find((c) => c.id === id)?.name ?? id;
  return (
    <ol className="flex flex-col divide-y divide-[var(--border-default)] rounded-s shadow-[inset_0_0_0_1px_var(--border-default)]">
      {items.map((i, idx) => (
        <li key={i.id} className={cn("flex gap-3 px-4 py-3", i.declined && "bg-danger-subtle/40")}>
          <span className="w-5 pt-0.5 font-mono text-xs text-fg-subtle">{idx + 1}</span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn("text-sm", i.declined && "text-fg-muted line-through")}>{i.description}</p>
                <p className="text-xs text-fg-subtle">
                  {formatDate(i.date)} · {categoryName(i.categoryId)} · <ProjectCode code={i.projectCode} />
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("font-mono text-sm", i.declined && "text-fg-muted line-through")}>{formatRupiah(i.amount)}</p>
                {i.amountUsdCents !== null && <p className="font-mono text-xs text-fg-subtle">{formatUsd(i.amountUsdCents)}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FileChips files={i.files} />
              {!i.declined && onDecline && (
                <button type="button" onClick={() => onDecline(i)} className="inline-flex items-center gap-1 rounded-xxs px-1.5 py-1 text-xs text-fg-danger hover:bg-hover">
                  <XCircle size={13} strokeWidth={1.5} /> Decline item
                </button>
              )}
              {i.declined && onRestore && (
                <button type="button" onClick={() => onRestore(i)} className="inline-flex items-center gap-1 rounded-xxs px-1.5 py-1 text-xs text-fg-muted hover:bg-hover">
                  <RotateCcw size={13} strokeWidth={1.5} /> Restore
                </button>
              )}
            </div>
            {i.declined && (
              <p className="rounded-xxs bg-danger-subtle px-2 py-1 text-xs text-fg-danger">
                Declined by {userName(i.declined.byUserId)}: {i.declined.note}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
