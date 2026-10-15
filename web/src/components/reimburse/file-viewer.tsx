"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, FileImage, FileText } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { FileRef } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Dialog } from "../ui/dialog";
import { Icon } from "../ui/icon";

const isPdf = (f: FileRef) => f.name.toLowerCase().endsWith(".pdf") || (f.url?.toLowerCase().endsWith(".pdf") ?? false);

/** Chip file yang bisa diklik untuk dibuka (struk, invoice, bukti transfer). */
export function FileChips({ files, tone = "neutral" }: { files: FileRef[]; tone?: "neutral" | "success" }) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  return (
    <>
      <div className="flex flex-wrap gap-1">
        {files.map((f, i) => (
          <button
            key={`${f.name}-${i}`}
            type="button"
            title={f.url ? `Open ${f.name}` : `${f.name} (no preview available)`}
            disabled={!f.url}
            onClick={(e) => {
              e.stopPropagation();
              setOpenAt(i);
            }}
            className={cn(
              "inline-flex max-w-40 items-center gap-1 rounded-xxs px-1.5 py-0.5 text-[11px] transition-colors enabled:hover:underline",
              tone === "success" ? "bg-success/15 text-fg-success" : "bg-sunken text-fg-muted enabled:hover:text-fg-brand",
            )}
          >
            <Icon icon={isPdf(f) ? FileText : FileImage} size={11} /> <span className="truncate">{f.name}</span>
          </button>
        ))}
      </div>
      {openAt !== null && <FileViewer files={files} start={openAt} onClose={() => setOpenAt(null)} />}
    </>
  );
}

/** Preview gambar/PDF dengan navigasi antar file. */
export function FileViewer({ files, start, onClose }: { files: FileRef[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const f = files[i];
  const go = (d: number) => setI((x) => (x + d + files.length) % files.length);

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      width="lg"
      title={f.name}
      description={files.length > 1 ? `File ${i + 1} of ${files.length}` : undefined}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex gap-1">
            {files.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous file" className="rounded-xxs p-2 text-fg-muted hover:bg-hover hover:text-fg"><Icon icon={ChevronLeft} /></button>
                <button type="button" onClick={() => go(1)} aria-label="Next file" className="rounded-xxs p-2 text-fg-muted hover:bg-hover hover:text-fg"><Icon icon={ChevronRight} /></button>
              </>
            )}
          </div>
          {f.url && (
            <div className="flex gap-3 text-sm">
              <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-fg-brand hover:underline"><Icon icon={ExternalLink} size={14} /> Open in new tab</a>
              <a href={f.url} download={f.name} className="inline-flex items-center gap-1.5 text-fg-brand hover:underline"><Icon icon={Download} size={14} /> Download</a>
            </div>
          )}
        </div>
      }
    >
      <div className="flex min-h-[50vh] items-center justify-center rounded-s bg-sunken">
        {!f.url ? (
          <p className="text-sm text-fg-muted">No preview available for this file.</p>
        ) : isPdf(f) ? (
          <iframe src={f.url} title={f.name} className="h-[65vh] w-full rounded-s bg-white" />
        ) : (
          // unoptimized: file upload berupa blob URL, tidak bisa lewat optimizer Next.
          <Image src={f.url} alt={f.name} width={1200} height={1600} unoptimized className="h-auto max-h-[65vh] w-auto max-w-full rounded-xs object-contain" />
        )}
      </div>
    </Dialog>
  );
}
