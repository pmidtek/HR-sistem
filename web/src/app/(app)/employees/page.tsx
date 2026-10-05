"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { canEdit, roleLabel } from "@/lib/access";
import { formatDate, formatRupiah } from "@/lib/format";
import { salaryProfiles } from "@/lib/mock/payroll";
import type { Role, User } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { saveUser } from "@/store/actions-business";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Avatar, Badge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Switch } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Table, Td, Th, Tr } from "@/components/ui/table";

type Draft = Omit<User, "id" | "employeeCode"> & { id?: string; employeeCode?: string };

export default function EmployeesPage() {
  const { state, user, team, today, run } = useAuthed();
  const editable = canEdit(user, team, "employees");
  const seeSalary = user.role === "finance" || user.role === "stakeholder";
  const [q, setQ] = useState("");
  const [teamId, setTeamId] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const teamName = (id: string) => state.teams.find((t) => t.id === id)?.name ?? "-";

  const rows = state.users.filter((u) => (!teamId || u.teamId === teamId) && `${u.name} ${u.email} ${u.employeeCode} ${u.position}`.toLowerCase().includes(q.toLowerCase()));
  const balance = (id: string) => state.leaveBalances.find((b) => b.userId === id && b.leaveTypeId === "annual");

  return (
    <>
      <PageHeader
        title="Pegawai"
        accent={`${state.users.filter((u) => u.active).length} aktif.`}
        description={editable ? "Kelola data pegawai, role, dan tim." : "Data pegawai (hanya lihat)."}
        actions={editable && <Button iconLeft={<Icon icon={Plus} />} onClick={() => setEditing({ name: "", email: "", role: "employee", teamId: state.teams[0]?.id ?? "", position: "", joinDate: today, active: true })}>Tambah pegawai</Button>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <Input placeholder="Cari nama, email, ID, jabatan…" value={q} onChange={(e) => setQ(e.target.value)} iconLeft={<Icon icon={Search} />} />
        <Select value={teamId} placeholder="Semua tim" onChange={(e) => setTeamId(e.target.value)} options={state.teams.map((t) => ({ value: t.id, label: t.name }))} />
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Pegawai</Th><Th>ID</Th><Th>Tim</Th><Th>Role</Th><Th>Masuk</Th><Th className="text-right">Sisa cuti</Th>
            {seeSalary && <Th className="text-right">Gaji pokok</Th>}
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const b = balance(u.id);
            return (
              <Tr key={u.id} className={editable ? "cursor-pointer" : undefined} onClick={() => editable && setEditing(u)}>
                <Td>
                  <span className="flex items-center gap-3">
                    <Avatar name={u.name} size="small" />
                    <span><span className="block text-sm">{u.name}</span><span className="text-xs text-fg-subtle">{u.position} · {u.email}</span></span>
                  </span>
                </Td>
                <Td className="font-mono text-xs">{u.employeeCode}</Td>
                <Td className="text-fg-muted">{teamName(u.teamId)}</Td>
                <Td><Badge tone={u.role === "employee" ? "neutral" : "brand"}>{roleLabel[u.role]}</Badge></Td>
                <Td className="text-xs text-fg-muted">{formatDate(u.joinDate)}</Td>
                <Td className="text-right font-mono text-xs">{b ? `${b.quota - b.used}/${b.quota}` : "-"}</Td>
                {seeSalary && <Td className="text-right font-mono text-xs">{salaryProfiles[u.id] ? formatRupiah(salaryProfiles[u.id].base) : "-"}</Td>}
                <Td>{u.active ? <Badge tone="success" dot>Aktif</Badge> : <Badge dot>Nonaktif</Badge>}</Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>

      {editing && (
        <Dialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id ? `Edit ${editing.employeeCode}` : "Pegawai baru"}
          footer={
            <>
              <Button variant="secondary" tone="neutral" onClick={() => setEditing(null)}>Batal</Button>
              <Button onClick={() => run((s) => saveUser(s, editing), "Data pegawai disimpan.") && setEditing(null)}>Simpan</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Input label="Nama lengkap" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input label="Email kantor" type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} helperText="Dipakai untuk login (nanti via Microsoft)." />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Role" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })} options={Object.entries(roleLabel).map(([value, label]) => ({ value, label }))} />
              <Select label="Tim" value={editing.teamId} onChange={(e) => setEditing({ ...editing, teamId: e.target.value })} options={state.teams.map((t) => ({ value: t.id, label: t.name }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Jabatan" value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })} />
              <Input label="Tanggal masuk" type="date" value={editing.joinDate} onChange={(e) => setEditing({ ...editing, joinDate: e.target.value })} />
            </div>
            <Switch checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} label="Pegawai aktif" />
          </div>
        </Dialog>
      )}
    </>
  );
}
