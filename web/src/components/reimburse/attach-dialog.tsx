"use client";

import { ClipboardPaste, FileImage, FileText, Link2, Loader2, UploadCloud, X } from "lucide-react";
import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { cn } from "@/lib/cn";
import { isReceiptFile, nameClipboardFiles } from "@/lib/files";
import type { FileRef } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { useOps } from "@/store/ops";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Icon } from "../ui/icon";

type Props = {
  title: string;
  description?: string;
  kind: "receipt" | "proof";
  files: FileRef[];
  onAdd: (files: FileRef[]) => void;
  onRemove: (index: number) => void;
  onClose: () => void;
};

const isPdf = (f: FileRef) => f.name.toLowerCase().endsWith(".pdf");

/**
 * Pop-up lampiran: dari perangkat (pilih / seret), paste dari clipboard (screenshot), atau dari link.
 * File langsung disimpan di server begitu ditambahkan.
 */
export function AttachDialog({ title, description, kind, files, onAdd, onRemove, onClose }: Props) {
  const { toast } = useAuthed();
  const ops = useOps();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [link, setLink] = useState("");

  async function addFiles(list: File[]) {
    const ok = list.filter(isReceiptFile);
    if (ok.length < list.length) toast("Only images and PDF files can be attached.", "danger");
    if (ok.length === 0) return;
    setBusy(`Uploading ${ok.length} file${ok.length > 1 ? "s" : ""}…`);
    const uploaded = await ops.upload(ok, kind);
    setBusy(null);
    if (uploaded) onAdd(uploaded);
  }

  /** Tombol "Paste from clipboard": baca gambar dari clipboard (browser akan minta izin sekali). */
  async function pasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      const found: File[] = [];
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/") || t === "application/pdf");
        if (type) found.push(new File([await item.getType(type)], "image.png", { type }));
      }
      if (found.length === 0) return toast("No image in the clipboard. Take a screenshot first (Mac: Cmd+Ctrl+Shift+4).", "neutral");
      await addFiles(nameClipboardFiles(found));
    } catch {
      toast("Your browser blocked clipboard access. Press Cmd+V (Ctrl+V) in this window instead.", "neutral");
    }
  }

  async function importLink() {
    if (!link.trim()) return;
    setBusy("Getting the file from the link…");
    const f = await ops.importUrl(link, kind);
    setBusy(null);
    if (f) {
      onAdd([f]);
      setLink("");
    }
  }

  // stopPropagation: pop-up ini dirender di dalam baris tabel (React portal), jangan sampai baris ikut menangkap paste/drop.
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const list = Array.from(e.clipboardData.files);
    if (list.length === 0) return;
    e.preventDefault();
    void addFiles(nameClipboardFiles(list));
  };
  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    void addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title} description={description} footer={<Button onClick={onClose} disabled={!!busy}>Done</Button>}>
      <div className="flex flex-col gap-4" onPaste={onPaste} onDragOver={(e) => e.stopPropagation()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={!!busy}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-s border border-dashed border-line-strong px-4 py-7 text-center transition-colors hover:bg-hover",
            dragging && "border-brand bg-brand-subtle/40",
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-sunken text-fg-brand">
            <Icon icon={busy ? Loader2 : UploadCloud} size={18} className={busy ? "animate-spin" : undefined} />
          </span>
          <span className="text-sm text-fg">{busy ?? <>Drop files here or <span className="text-fg-brand underline-offset-2 hover:underline">browse from device</span></>}</span>
          <span className="text-xs text-fg-subtle">Images or PDF, up to 10 MB each. You can pick several at once.</span>
        </button>
        <input ref={input} type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />

        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <Button variant="secondary" tone="neutral" iconLeft={<Icon icon={ClipboardPaste} size={16} />} onClick={pasteFromClipboard} disabled={!!busy}>
            Paste from clipboard
          </Button>
          <p className="self-center text-xs text-fg-subtle">Took a screenshot? Click here or press <kbd className="rounded-xxs bg-sunken px-1 font-mono">⌘V</kbd> in this window.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Icon icon={Link2} size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void importLink()}
                placeholder="Paste a link to the file (Google Drive, Dropbox, e-receipt)"
                className="h-10 w-full rounded-xxs bg-sunken pr-3 pl-9 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border-default)] outline-none placeholder:text-fg-subtle focus-visible:shadow-[inset_0_0_0_1px_var(--brand)]"
              />
            </div>
            <Button variant="secondary" tone="neutral" onClick={importLink} disabled={!!busy || !link.trim()}>Add</Button>
          </div>
          <p className="text-xs text-fg-subtle">The link must be shared publicly (&ldquo;Anyone with the link&rdquo;). The file is copied into SIDESAH.</p>
        </div>

        {files.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <p className="text-xs text-fg-muted">Attached ({files.length})</p>
            <ul className="flex flex-col gap-1">
              {files.map((f, i) => (
                <li key={`${f.id ?? f.name}-${i}`} className="flex items-center gap-2 rounded-xs bg-sunken px-3 py-2 text-sm">
                  <Icon icon={isPdf(f) ? FileText : FileImage} size={14} className="text-fg-subtle" />
                  {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:text-fg-brand hover:underline">{f.name}</a> : <span className="flex-1 truncate">{f.name}</span>}
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemove(i)} className="rounded-xxs p-1 text-fg-subtle hover:bg-hover hover:text-fg"><Icon icon={X} size={14} /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
