"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useAuthed } from "@/store/app-provider";
import { createProject } from "@/store/actions-business";
import { useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox";
import { Dialog } from "../ui/dialog";
import { Avatar } from "../ui/display";
import { Field, Input } from "../ui/form";
import { Icon } from "../ui/icon";

/** Buat project baru. Kode PRYYXXXX otomatis. Klien opsional (kosong = project internal). */
export function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const { state, today, run } = useAuthed();
  const { userOptions, userName } = useLookups();
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [leadId, setLeadId] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [start, setStart] = useState(today);
  const [target, setTarget] = useState("");
  const delivery = state.teams.filter((t) => t.kind === "delivery");
  const valid = name.trim() && teamIds.length > 0 && leadId && target >= start;

  function save() {
    if (!valid) return;
    const memberIds = [...new Set([leadId, ...members])];
    const ok = run(
      (s) => createProject(s, { name, opportunityId: null, companyId: companyId || null, teamIds, leadId, memberIds, startDate: start, targetDate: target }, today),
      "Project dibuat dan kodenya siap dipakai di timesheet.",
    );
    if (ok) onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Buat project"
      description="Kode PRYYXXXX dibuat otomatis dan langsung bisa dipakai di timesheet."
      footer={
        <>
          <Button variant="secondary" tone="neutral" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={!valid}>Buat project</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Nama project" value={name} onChange={(e) => setName(e.target.value)} />
        <Combobox
          label="Klien (opsional)"
          value={companyId}
          onChange={setCompanyId}
          options={[{ value: "", label: "Internal (tanpa klien)" }, ...state.companies.map((c) => ({ value: c.id, label: c.name, hint: c.industry }))]}
          placeholder="Internal (tanpa klien)"
        />
        <Field label="Tim pelaksana (bisa lebih dari satu)" id="teams">
          <div className="flex flex-wrap gap-2">
            {delivery.map((t) => {
              const on = teamIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTeamIds((x) => (on ? x.filter((i) => i !== t.id) : [...x, t.id]))}
                  className={cn("h-8 rounded-xxs px-3 text-sm shadow-[inset_0_0_0_1px_var(--border-strong)]", on ? "bg-brand-subtle text-fg-brand shadow-[inset_0_0_0_1px_var(--brand)]" : "text-fg-muted hover:bg-hover")}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </Field>
        <Combobox label="Project Lead" value={leadId} onChange={setLeadId} options={userOptions} placeholder="Pilih lead" />
        <Combobox label="Tambah anggota" value="" onChange={(v) => setMembers((m) => (m.includes(v) ? m : [...m, v]))} options={userOptions.filter((o) => !members.includes(o.value))} placeholder="Cari pegawai…" />
        {members.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <span key={m} className="inline-flex items-center gap-1.5 rounded-pill bg-sunken py-1 pr-2 pl-1 text-xs">
                <Avatar name={userName(m)} size="small" /> {userName(m)}
                <button type="button" aria-label="Hapus" onClick={() => setMembers((x) => x.filter((i) => i !== m))} className="text-fg-subtle hover:text-fg">
                  <Icon icon={X} size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tanggal mulai" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="Target selesai" type="date" min={start} value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
      </div>
    </Dialog>
  );
}
