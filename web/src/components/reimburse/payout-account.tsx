"use client";

import { BadgeCheck, Landmark, Pencil, ShieldAlert } from "lucide-react";
import { useId, useState } from "react";
import { maskAccount } from "@/lib/calc/reimburse-risk";
import { formatDate } from "@/lib/format";
import type { User } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { useOps } from "@/store/ops";
import { useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Badge, Card } from "../ui/display";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/form";
import { Icon } from "../ui/icon";

const BANKS = ["BCA", "Mandiri", "BNI", "BRI", "BSI", "CIMB Niaga", "Permata", "Danamon", "BTN", "OCBC", "Maybank", "Jago", "SeaBank", "Jenius (SMBC)", "blu (BCA Digital)"];

/** Nomor rekening lengkap hanya untuk pemilik & Finance; selain itu disamarkan. */
export function canSeeFullAccount(viewer: Pick<User, "id" | "role">, ownerId: string): boolean {
  return viewer.id === ownerId || viewer.role === "finance";
}

/** Satu baris info rekening + status verifikasi. */
export function PayoutAccountLine({ owner, onVerify }: { owner: User | undefined; onVerify?: () => void }) {
  const { user } = useAuthed();
  const { userName } = useLookups();
  const a = owner?.bankAccount;
  if (!owner || !a) return <p className="flex items-center gap-2 text-sm text-fg-danger"><Icon icon={ShieldAlert} size={14} /> No payout bank account yet.</p>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xs bg-sunken text-fg-muted"><Icon icon={Landmark} size={16} /></span>
        <div>
          <p className="text-sm">{a.bankName} · <span className="font-mono">{canSeeFullAccount(user, owner.id) ? a.accountNumber : maskAccount(a.accountNumber)}</span></p>
          <p className="text-xs text-fg-subtle">a.n. {a.accountHolder} · updated {formatDate(a.updatedAt.slice(0, 10))}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {a.verified
          ? <Badge tone="success" dot>Verified{a.verifiedBy ? ` by ${userName(a.verifiedBy)}` : ""}</Badge>
          : <Badge tone="warning" dot>Waiting for Finance verification</Badge>}
        {!a.verified && onVerify && <Button size="small" iconLeft={<Icon icon={BadgeCheck} size={14} />} onClick={onVerify}>Verify</Button>}
      </div>
    </div>
  );
}

/** Kartu "Payout account" di halaman reimburse milik sendiri. */
export function MyPayoutCard() {
  const { user } = useAuthed();
  const [editing, setEditing] = useState(false);
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-medium">Payout account</h3>
        <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Pencil} size={14} />} onClick={() => setEditing(true)}>
          {user.bankAccount ? "Change" : "Add account"}
        </Button>
      </div>
      <PayoutAccountLine owner={user} />
      <p className="text-xs text-fg-subtle">Transfers only go to a verified account. Any change needs Finance to verify it again.</p>
      {editing && <BankAccountDialog owner={user} onClose={() => setEditing(false)} />}
    </Card>
  );
}

export function BankAccountDialog({ owner, onClose }: { owner: User; onClose: () => void }) {
  const ops = useOps();
  const listId = useId();
  const [busy, setBusy] = useState(false);
  const [bankName, setBankName] = useState(owner.bankAccount?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(owner.bankAccount?.accountNumber ?? "");
  const [accountHolder, setAccountHolder] = useState(owner.bankAccount?.accountHolder ?? owner.name.toUpperCase());

  async function save() {
    setBusy(true);
    const ok = await ops.saveBank(owner.id, { bankName, accountNumber, accountHolder }, "Bank account saved. Finance will verify it.");
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={owner.bankAccount ? "Change payout account" : "Add payout account"}
      description="Use an account in your own name. A different holder name is flagged for Finance."
      footer={<><Button variant="secondary" tone="neutral" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></>}
    >
      <div className="flex flex-col gap-4">
        <datalist id={listId}>{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
        <Input label="Bank" list={listId} placeholder="e.g. BCA" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        <Input label="Account number" inputMode="numeric" placeholder="Digits only" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        <Input label="Account holder name" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} helperText="As printed in your bank book / app." />
      </div>
    </Dialog>
  );
}

/** Tombol verifikasi untuk Finance (dipakai di detail pengajuan & daftar pegawai). */
export function useVerifyAccount(ownerId: string): (() => void) | undefined {
  const { actor } = useAuthed();
  const ops = useOps();
  if (actor.role !== "finance" || actor.id === ownerId) return undefined;
  return () => void ops.verifyBank(ownerId, "Bank account verified.");
}
