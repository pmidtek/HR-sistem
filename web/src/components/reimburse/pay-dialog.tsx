"use client";

import { Paperclip, X } from "lucide-react";
import { useState } from "react";
import { claimTotal } from "@/lib/calc/reimburse";
import { maskAccount } from "@/lib/calc/reimburse-risk";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import type { FileRef } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { useOps } from "@/store/ops";
import { useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input, Select } from "../ui/form";
import { Icon } from "../ui/icon";
import { AttachDialog } from "./attach-dialog";
import { FileChips } from "./file-viewer";
import { canSeeFullAccount } from "./payout-account";

/** Finance/HR/Stakeholder membayar satu atau beberapa pengajuan sekaligus, dengan bukti pembayaran. */
export function PayDialog({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone?: () => void }) {
  const { state, actor, today } = useAuthed();
  const ops = useOps();
  const [busy, setBusy] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const { userName } = useLookups();
  const claims = state.reimbursements.filter((r) => ids.includes(r.id));
  const total = claims.reduce((s, r) => s + claimTotal(r), 0);
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<"transfer" | "payroll">("transfer");
  const [reference, setReference] = useState("");
  const [proofFiles, setProofFiles] = useState<FileRef[]>([]);
  const [error, setError] = useState<string | undefined>();
  // Transfer hanya ke rekening yang sudah diverifikasi Finance (bisa dimatikan di Settings).
  const blocked = method === "transfer" && state.settings.reimburse.requireVerifiedAccount
    ? claims.filter((r) => !state.users.find((u) => u.id === r.userId)?.bankAccount?.verified)
    : [];

  async function pay() {
    if (proofFiles.length === 0) return setError("Upload the payment proof (e.g. transfer receipt) first.");
    setBusy(true);
    const ok = await ops.payClaims(ids, { date, method, reference: reference.trim(), proofFiles }, `${claims.length} claim(s) marked as paid.`);
    setBusy(false);
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
          <Button onClick={pay} disabled={blocked.length > 0 || busy}>{busy ? "Saving…" : `Mark as paid · ${formatRupiah(total)}`}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ul className="flex max-h-48 flex-col divide-y divide-[var(--border-default)] overflow-y-auto rounded-s bg-sunken px-3">
          {claims.map((r) => {
            const a = state.users.find((u) => u.id === r.userId)?.bankAccount;
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate"><span className="font-mono text-xs text-fg-subtle">{r.number}</span> {userName(r.userId)}</span>
                  <span className={cn("block text-xs", !a ? "text-fg-danger" : a.verified ? "text-fg-subtle" : "text-warning")}>
                    {a ? `${a.bankName} ${canSeeFullAccount(actor, r.userId) ? a.accountNumber : maskAccount(a.accountNumber)} a.n. ${a.accountHolder}${a.verified ? "" : " · not verified"}` : "No bank account"}
                  </span>
                </span>
                <span className="font-mono">{formatRupiah(claimTotal(r))}</span>
              </li>
            );
          })}
        </ul>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Payment date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value === "payroll" ? "payroll" : "transfer")} options={[{ value: "transfer", label: "Bank transfer" }, { value: "payroll", label: "Via payroll" }]} />
        </div>
        <Input label="Reference no. (optional)" placeholder="e.g. transfer reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        <div className="flex flex-col gap-2">
          <p className="text-xs text-fg-muted">Payment proof <span className="text-fg-danger">*</span></p>
          <button
            type="button"
            onClick={() => setAttachOpen(true)}
            className="flex h-14 items-center justify-center gap-2 rounded-xs border border-dashed border-line-strong text-sm text-fg-muted transition-colors hover:bg-hover hover:text-fg"
          >
            <Icon icon={Paperclip} size={16} /> {proofFiles.length === 0 ? "Attach transfer receipt" : "Add more"}
            <span className="text-xs text-fg-subtle">· device, screenshot, or link</span>
          </button>
          {proofFiles.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-xs bg-sunken px-3 py-1.5 text-xs">
              <FileChips files={[f]} />
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setProofFiles((x) => x.filter((_, j) => j !== i))} className="text-fg-subtle hover:text-fg">
                <Icon icon={X} size={14} />
              </button>
            </div>
          ))}
          {error && <p className="text-xs text-fg-danger">{error}</p>}
          {blocked.length > 0 && (
            <p className="rounded-xs bg-warning-subtle px-3 py-2 text-xs text-warning">
              {blocked.map((r) => userName(r.userId)).join(", ")}: bank account not verified yet. Verify it first (Employees page or the claim detail).
            </p>
          )}
        </div>
      </div>
      {attachOpen && (
        <AttachDialog
          kind="proof"
          title="Payment proof"
          description="Transfer receipt or bank statement screenshot. The employee will see it."
          files={proofFiles}
          onAdd={(f) => { setProofFiles((x) => [...x, ...f]); setError(undefined); }}
          onRemove={(i) => setProofFiles((x) => x.filter((_, j) => j !== i))}
          onClose={() => setAttachOpen(false)}
        />
      )}
    </Dialog>
  );
}
