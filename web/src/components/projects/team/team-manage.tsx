"use client";

import { Check, Copy, Link2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { formatDate, formatRelative } from "@/lib/format";
import type { ProjectRole } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { addMember, answerJoinRequest, createInviteLink, revokeInviteLink, roleLabel } from "@/store/actions-team";
import { stamp } from "@/store/project-core";
import { newId } from "@/store/state";
import { useLookups } from "../../hooks";
import { Button, IconButton } from "../../ui/button";
import { Combobox } from "../../ui/combobox";
import { Avatar, Card } from "../../ui/display";
import { Select, Switch } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { useProject } from "../workspace/context";

/** Tambah anggota (picker searchable, default difilter tim pelaksana). */
export function AddMemberCard() {
  const { state, actor, today, run } = useAuthed();
  const { project } = useProject();
  const { teamName } = useLookups();
  const [allTeams, setAllTeams] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const options = state.users
    .filter((u) => u.active && !project.memberIds.includes(u.id) && (allTeams || project.teamIds.includes(u.teamId)))
    .map((u) => ({ value: u.id, label: u.name, hint: teamName(u.teamId) }));
  const add = () => run((s) => addMember(s, project.id, userId, role, actor, today, stamp(today)), "Anggota ditambahkan dan mendapat notifikasi.") && setUserId("");

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="font-display text-sm font-medium">Tambah anggota</h3>
      <Combobox value={userId} onChange={setUserId} options={options} placeholder={options.length ? "Cari pegawai…" : "Semua pegawai tim ini sudah jadi anggota"} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-36"><Select value={role} onChange={(e) => setRole(e.target.value as ProjectRole)} options={Object.entries(roleLabel).map(([value, label]) => ({ value, label }))} aria-label="Peran" /></div>
        <Switch checked={allTeams} onChange={setAllTeams} label="Tampilkan semua tim" />
        <Button size="small" className="ml-auto" iconLeft={<Icon icon={UserPlus} size={14} />} disabled={!userId} onClick={add}>Tambah</Button>
      </div>
    </Card>
  );
}

export function JoinRequestsCard() {
  const { state, actor, today, run } = useAuthed();
  const { project } = useProject();
  const { userName, user, teamName } = useLookups();
  const list = state.joinRequests.filter((j) => j.projectId === project.id);
  return (
    <Card className="flex flex-col gap-3">
      <h3 className="font-display text-sm font-medium">Permintaan bergabung</h3>
      {list.length === 0 && <p className="text-xs text-fg-muted">Tidak ada permintaan.</p>}
      {list.map((j) => (
        <div key={j.id} className="flex items-center gap-3">
          <Avatar name={userName(j.userId)} size="small" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{userName(j.userId)}</p>
            <p className="text-xs text-fg-subtle">{teamName(user(j.userId)?.teamId ?? "")} · {formatRelative(j.requestedAt, stamp(today))}</p>
          </div>
          <IconButton label="Tolak" size="small" onClick={() => run((s) => answerJoinRequest(s, j.id, false, actor, today, stamp(today)), "Permintaan ditolak.")}><Icon icon={X} size={14} /></IconButton>
          <Button size="small" iconLeft={<Icon icon={Check} size={14} />} onClick={() => run((s) => answerJoinRequest(s, j.id, true, actor, today, stamp(today)), "Permintaan diterima.")}>Terima</Button>
        </div>
      ))}
    </Card>
  );
}

/** Link undangan (simulasi token) dengan masa berlaku dan tombol salin. */
export function InviteLinksCard() {
  const { state, actor, today, run, toast } = useAuthed();
  const { project } = useProject();
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const links = state.inviteLinks.filter((l) => l.projectId === project.id);
  const urlOf = (token: string) => `${typeof window === "undefined" ? "" : window.location.origin}/projects/${project.id}/join?token=${token}`;
  const generate = () => run((s) => createInviteLink(s, project.id, days, actor, today, stamp(today), newId("tok").replace(/\W/g, "") + Math.random().toString(36).slice(2, 10)), "Link undangan dibuat.");
  const copy = (token: string) => navigator.clipboard.writeText(urlOf(token)).then(() => toast("Link disalin.", "success"), () => toast("Gagal menyalin; salin manual dari kolom link.", "danger"));

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="font-display text-sm font-medium">Link undangan</h3>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-36"><Select value={String(days)} onChange={(e) => setDays(Number(e.target.value) as 1 | 7 | 30)} options={[{ value: "1", label: "Berlaku 1 hari" }, { value: "7", label: "Berlaku 7 hari" }, { value: "30", label: "Berlaku 30 hari" }]} aria-label="Masa berlaku" /></div>
        <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Link2} size={14} />} onClick={generate}>Buat link</Button>
      </div>
      {links.map((l) => (
        <div key={l.id} className="flex items-center gap-2 rounded-xs bg-sunken px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-muted">{urlOf(l.token)}</code>
          <span className={l.expiresAt < today ? "text-xs text-fg-danger" : "text-xs text-fg-subtle"}>s/d {formatDate(l.expiresAt)}</span>
          <IconButton label="Salin link" size="small" onClick={() => copy(l.token)}><Icon icon={Copy} size={14} /></IconButton>
          <IconButton label="Cabut link" size="small" onClick={() => run((s) => revokeInviteLink(s, l.id, actor, stamp(today)), "Link dicabut.")}><Icon icon={X} size={14} /></IconButton>
        </div>
      ))}
      <p className="text-xs text-fg-subtle">Simulasi: link belum bisa dipakai login sampai backend tersedia.</p>
    </Card>
  );
}
