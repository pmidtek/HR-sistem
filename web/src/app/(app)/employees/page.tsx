"use client";

import { BadgeCheck, Plus, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { canEdit, isReleased, roleLabel } from "@/lib/access";
import { maskAccount } from "@/lib/calc/reimburse-risk";
import { cn } from "@/lib/cn";
import { formatDate, formatRupiah } from "@/lib/format";
import { salaryProfiles } from "@/lib/mock/payroll";
import type { User } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { verifyBankAccount } from "@/store/actions-bank";
import { EmployeeDialog, type EmployeeDraft } from "@/components/employees/employee-dialog";
import { canSeeFullAccount } from "@/components/reimburse/payout-account";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Avatar, Badge } from "@/components/ui/display";
import { Input, Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { rowClass, Table, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";

type Filter = "all" | "employees" | "externals" | "unverified";

export default function EmployeesPage() {
  const { state, user, team, actor, today, run } = useAuthed();
  const editable = canEdit(user, team, "employees");
  const seeSalary = isReleased("payroll") && (user.role === "finance" || user.role === "stakeholder");
  const showLeave = isReleased("leave");
  const [q, setQ] = useState("");
  const [teamId, setTeamId] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<EmployeeDraft | null>(null);
  const teamName = (id: string) => state.teams.find((t) => t.id === id)?.name ?? "-";
  const userName = (id: string) => state.users.find((u) => u.id === id)?.name ?? "-";

  const match = (u: User) =>
    filter === "all" ? true
    : filter === "employees" ? u.role !== "external"
    : filter === "externals" ? u.role === "external"
    : !!u.bankAccount && !u.bankAccount.verified;
  const rows = state.users.filter((u) => match(u) && (!teamId || u.teamId === teamId) && `${u.name} ${u.email} ${u.employeeCode} ${u.position} ${u.external?.company ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const balance = (id: string) => state.leaveBalances.find((b) => b.userId === id && b.leaveTypeId === "annual");
  const unverified = state.users.filter((u) => u.bankAccount && !u.bankAccount.verified).length;
  const blank = (role: "employee" | "external"): EmployeeDraft => ({
    name: "", email: "", role, teamId: state.teams[0]?.id ?? "", position: "", joinDate: today, active: true,
    external: role === "external" ? { company: "", sponsorId: "", accessUntil: "" } : null,
  });

  return (
    <>
      <PageHeader
        title="Employees"
        description={editable ? "Manage employees, externals (freelancers & vendors), and payout accounts." : "Directory (view only)."}
        actions={editable && (
          <>
            <Button variant="secondary" tone="neutral" iconLeft={<Icon icon={UserPlus} />} onClick={() => setEditing(blank("external"))}>Add external</Button>
            <Button iconLeft={<Icon icon={Plus} />} onClick={() => setEditing(blank("employee"))}>Add employee</Button>
          </>
        )}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All", count: state.users.length },
            { value: "employees", label: "Employees", count: state.users.filter((u) => u.role !== "external").length },
            { value: "externals", label: "Externals", count: state.users.filter((u) => u.role === "external").length },
            { value: "unverified", label: "Unverified accounts", count: unverified },
          ]}
        />
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[280px_200px]">
          <Input placeholder="Search name, email, ID, company…" value={q} onChange={(e) => setQ(e.target.value)} iconLeft={<Icon icon={Search} />} />
          <Select value={teamId} placeholder="All teams" onChange={(e) => setTeamId(e.target.value)} options={state.teams.map((t) => ({ value: t.id, label: t.name }))} />
        </div>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Person</Th><Th>ID</Th><Th>Team</Th><Th>Role</Th><Th>Payout account</Th>{showLeave && <Th className="text-right">Leave left</Th>}
            {seeSalary && <Th className="text-right">Base salary</Th>}
            <Th>Status</Th>
          </tr>
        </thead>
        <Stagger as="tbody">
          {rows.map((u, i) => {
            const b = balance(u.id);
            const a = u.bankAccount;
            const expired = u.role === "external" && !!u.external && u.external.accessUntil < today;
            return (
              <StaggerItem as="tr" key={u.id} index={i} className={cn(rowClass, editable && "cursor-pointer")} onClick={() => editable && setEditing(u)}>
                <Td>
                  <span className="flex items-center gap-3">
                    <Avatar name={u.name} size="small" />
                    <span>
                      <span className="block text-sm">{u.name}</span>
                      <span className="text-xs text-fg-subtle">{u.position}{u.external?.company ? ` · ${u.external.company}` : ""} · {u.email}</span>
                      {u.external && <span className="block text-[11px] text-fg-brand">PIC {userName(u.external.sponsorId)}</span>}
                    </span>
                  </span>
                </Td>
                <Td className="font-mono text-xs">{u.employeeCode}</Td>
                <Td className="text-fg-muted">{teamName(u.teamId)}</Td>
                <Td><Badge tone={u.role === "employee" ? "neutral" : u.role === "external" ? "warning" : "brand"}>{roleLabel[u.role]}</Badge></Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  {!a ? <span className="text-xs text-fg-subtle">Not set</span> : (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs">{a.bankName} <span className="font-mono">{canSeeFullAccount(user, u.id) ? a.accountNumber : maskAccount(a.accountNumber)}</span></span>
                      {a.verified ? <Badge tone="success" dot>Verified</Badge> : actor.role === "finance" && actor.id !== u.id ? (
                        <Button size="small" iconLeft={<Icon icon={BadgeCheck} size={14} />} onClick={() => run((s) => verifyBankAccount(s, u.id, actor), "Bank account verified.")}>Verify</Button>
                      ) : <Badge tone="warning" dot>Not verified</Badge>}
                    </div>
                  )}
                </Td>
                {showLeave && <Td className="text-right font-mono text-xs">{b ? `${b.quota - b.used}/${b.quota}` : "-"}</Td>}
                {seeSalary && <Td className="text-right font-mono text-xs">{salaryProfiles[u.id] ? formatRupiah(salaryProfiles[u.id].base) : "-"}</Td>}
                <Td>
                  {!u.active ? <Badge dot>Inactive</Badge> : expired ? <Badge tone="danger" dot>Access ended</Badge> : <Badge tone="success" dot>Active</Badge>}
                  {u.external && !expired && u.active && <p className="mt-1 text-[11px] text-fg-subtle">until {formatDate(u.external.accessUntil)}</p>}
                </Td>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Table>

      {editing && <EmployeeDialog draft={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
