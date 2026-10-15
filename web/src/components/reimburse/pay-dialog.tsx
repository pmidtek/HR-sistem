"use client";

import { Paperclip, X } from "lucide-react";
import { useState } from "react";
import { claimTotal } from "@/lib/calc/reimburse";
import { formatRupiah } from "@/lib/format";
import type { FileRef } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { payReimburseClaims } from "@/store/actions-reimburse";
import { useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input, Select } from "../ui/form";
import { Icon } from "../ui/icon";
import { FileChips } from "./file-viewer";

/** Finance/HR/Stakeholder membayar satu atau beberapa pengajuan sekaligus, dengan bukti pembayaran. */
export function PayDialog({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone?: () => void }) {
  const { state, actor, today, run } = useAuthed();
  const { userName } = useLookups();
  const claims = state.reimbursements.filter((r) => ids.includes(r.id));
  const total = claims.reduce((s, r) => s + claimTotal(r), 0);
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<"transfer" | "payroll">("transfer");
  const [reference, setReference] = useState("");
  const [proofFiles, setProofFiles] = useState<FileRef[]>([]);
  const [error, setError] = useState<string | undefined>();

  function pay() {
    if (proofFiles.length === 0) return setError("Upload the payment proof (e.g. transfer receipt) first.");
    const ok = run((s) => payReimburseClaims(s, ids, { date, method, reference: reference.trim(), proofFiles }, actor), `${claims.length} claim(s) marked as paid.`);
    if (ok) {
      onDone?.();
      onClose();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Pay ${claims.length} claim${claims.length > 1 ? "s" : ""}`}
      description="Each claim is paid in full (declined items excluded). The employee will see the payment proof."
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={onClose}>Cancel</Button>
          <Button onClick={pay}>Mark as paid · {formatRupiah(total)}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ul className="flex max-h-48 flex-col divide-y divide-[var(--border-default)] overflow-y-auto rounded-s bg-sunken px-3">
          {claims.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate"><span className="font-mono text-xs text-fg-subtle">{r.number}</span> {userName(r.userId)}</span>
              <span className="font-mono">{formatRupiah(claimTotal(r))}</span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Payment date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value === "payroll" ? "payroll" : "transfer")} options={[{ value: "transfer", label: "Bank transfer" }, { value: "payroll", label: "Via payroll" }]} />
        </div>
        <Input label="Reference no. (optional)" placeholder="e.g. transfer reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        <div className="flex flex-col gap-2">
          <p className="text-xs text-fg-muted">Payment proof <span className="text-fg-danger">*</span></p>
          <label className="flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border border-dashed border-line-strong text-xs text-fg-muted hover:bg-hover">
            <Icon icon={Paperclip} />
            Upload transfer receipt (image or PDF, can be more than 1)
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => {
                // Baca nama file dulu; input dikosongkan sesudahnya supaya file yang sama bisa dipilih lagi.
                const added = Array.from(e.target.files ?? []).map((x) => ({ name: x.name, url: URL.createObjectURL(x) }));
                setProofFiles((f) => [...f, ...added]);
                setError(undefined);
                e.target.value = "";
              }}
            />
          </label>
          {proofFiles.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-xs bg-sunken px-3 py-1.5 text-xs">
              <FileChips files={[f]} />
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setProofFiles((x) => x.filter((_, j) => j !== i))} className="text-fg-subtle hover:text-fg">
                <Icon icon={X} size={14} />
              </button>
            </div>
          ))}
          {error && <p className="text-xs text-fg-danger">{error}</p>}
        </div>
      </div>
    </Dialog>
  );
}
