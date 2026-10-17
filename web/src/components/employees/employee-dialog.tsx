"use client";

import { useState } from "react";
import { roleLabel } from "@/lib/access";
import type { Role, User } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { useOps } from "@/store/ops";
import { BankAccountDialog, PayoutAccountLine, useVerifyAccount } from "../reimburse/payout-account";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox";
import { Dialog } from "../ui/dialog";
import { Input, Select, Switch } from "../ui/form";

export type EmployeeDraft = Omit<User, "id" | "employeeCode"> & { id?: string; employeeCode?: string };

/** Tambah/ubah pegawai atau external (freelance/vendor). Rekening diubah lewat dialog terpisah (perlu verifikasi). */
export function EmployeeDialog({ draft, onClose }: { draft: EmployeeDraft; onClose: () => void }) {
  const { state, backend, ssoEnabled } = useAuthed();
  const ops = useOps();
  const [d, setD] = useState<EmployeeDraft>(draft);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const saved = d.id ? state.users.find((u) => u.id === d.id) : undefined;
  const verify = useVerifyAccount(d.id ?? "");
  const isExternal = d.role === "external";
  const picOptions = state.users.filter((u) => u.active && u.role !== "external" && u.id !== d.id).map((u) => ({ value: u.id, label: u.name, hint: u.position }));
  const ext = d.external ?? { company: "", sponsorId: "", accessUntil: "" };

  function setRole(role: Role) {
    setD({ ...d, role, external: role === "external" ? (d.external ?? { company: "", sponsorId: "", accessUntil: "" }) : null });
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={d.id ? `Edit ${d.employeeCode}` : isExternal ? "New external" : "New employee"}
      description={isExternal ? "Freelancers and vendors can only submit reimbursements. Every claim is confirmed by their PIC first." : undefined}
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={async () => {
            setBusy(true);
            const ok = await ops.saveUser({ ...d, password }, isExternal ? "External saved." : "Employee saved.");
            setBusy(false);
            if (ok) onClose();
          }}>{busy ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Full name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        <Input label={isExternal ? "Email" : "Work email"} type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} helperText={isExternal ? "Used to sign in. Externals can't use the office Microsoft account." : ssoEnabled ? "They sign in with their office Microsoft account." : "Used to sign in."} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Role" value={d.role} onChange={(e) => setRole(e.target.value as Role)} options={Object.entries(roleLabel).map(([value, label]) => ({ value, label }))} />
          <Select label="Team" value={d.teamId} onChange={(e) => setD({ ...d, teamId: e.target.value })} options={state.teams.map((t) => ({ value: t.id, label: t.name }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={isExternal ? "Role / service" : "Position"} placeholder={isExternal ? "e.g. Freelance videographer" : ""} value={d.position} onChange={(e) => setD({ ...d, position: e.target.value })} />
          <Input label={isExternal ? "Start date" : "Join date"} type="date" value={d.joinDate} onChange={(e) => setD({ ...d, joinDate: e.target.value })} />
        </div>

        {isExternal && (
          <div className="flex flex-col gap-3 rounded-s bg-sunken p-4">
            <Input label="Company / vendor (optional)" placeholder="Leave empty for individual freelancers" value={ext.company} onChange={(e) => setD({ ...d, external: { ...ext, company: e.target.value } })} />
            <div className="grid grid-cols-2 gap-3">
              <Combobox label="PIC (internal)" value={ext.sponsorId} onChange={(v) => setD({ ...d, external: { ...ext, sponsorId: v } })} options={picOptions} placeholder="Who confirms their claims?" />
              <Input label="Access until" type="date" value={ext.accessUntil} onChange={(e) => setD({ ...d, external: { ...ext, accessUntil: e.target.value } })} helperText="Usually the contract end date." />
            </div>
          </div>
        )}

        {backend && (isExternal || !ssoEnabled) && (
          <Input
            label={d.id ? "New password (optional)" : "Initial password"}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText={d.id ? "Fill only to reset their password." : "At least 8 characters. Share it with the person privately; they can change it later."}
          />
        )}

        <Switch checked={d.active} onChange={(v) => setD({ ...d, active: v })} label={isExternal ? "Access active" : "Active employee"} />

        {saved && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-fg-subtle">Payout bank account</p>
              <button type="button" onClick={() => setBankOpen(true)} className="text-xs text-fg-brand hover:underline">{saved.bankAccount ? "Change" : "Add"}</button>
            </div>
            <PayoutAccountLine owner={saved} onVerify={verify} />
          </div>
        )}
      </div>
      {bankOpen && saved && <BankAccountDialog owner={saved} onClose={() => setBankOpen(false)} />}
    </Dialog>
  );
}
