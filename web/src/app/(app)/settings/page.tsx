"use client";

import { useState, type ComponentType } from "react";
import type { Role } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { PageHeader } from "@/components/shell/page-header";
import { CompanyForm, OvertimeForm, PayrollForm, WorkForm } from "@/components/settings/general-forms";
import { ActivityList, CategoryList, HolidayList, LeaveTypeList, TeamList } from "@/components/settings/master-lists";
import { BpjsTable, TerTable } from "@/components/settings/rate-tables";
import { cn } from "@/lib/cn";

type Section = {
  id: string;
  label: string;
  group: string;
  /** Role yang boleh mengubah. Role lain non-pegawai hanya bisa melihat. */
  editors: Role[];
  Component: ComponentType<{ readOnly: boolean }>;
};

const sections: Section[] = [
  { id: "work", label: "Jam kerja & timesheet", group: "HR", editors: ["hr", "stakeholder"], Component: WorkForm },
  { id: "leave", label: "Jenis cuti", group: "HR", editors: ["hr", "stakeholder"], Component: LeaveTypeList },
  { id: "holidays", label: "Kalender libur", group: "HR", editors: ["hr", "stakeholder"], Component: HolidayList },
  { id: "activity", label: "Activity code", group: "HR", editors: ["hr", "stakeholder"], Component: ActivityList },
  { id: "teams", label: "Tim", group: "HR", editors: ["hr", "stakeholder"], Component: TeamList },
  { id: "overtime", label: "Rumus lembur", group: "Finance", editors: ["finance", "stakeholder"], Component: OvertimeForm },
  { id: "payroll", label: "Periode payroll", group: "Finance", editors: ["finance", "stakeholder"], Component: PayrollForm },
  { id: "bpjs", label: "Tarif BPJS", group: "Finance", editors: ["finance", "stakeholder"], Component: BpjsTable },
  { id: "ter", label: "PPh 21 TER", group: "Finance", editors: ["finance", "stakeholder"], Component: TerTable },
  { id: "categories", label: "Kategori reimburse", group: "Finance", editors: ["finance", "stakeholder"], Component: CategoryList },
  { id: "company", label: "Perusahaan", group: "Umum", editors: ["hr", "finance", "stakeholder"], Component: CompanyForm },
];

export default function SettingsPage() {
  const { user } = useAuthed();
  const [active, setActive] = useState(() => sections.find((s) => s.editors.includes(user.role))?.id ?? "work");
  const current = sections.find((s) => s.id === active) ?? sections[0];
  const groups = [...new Set(sections.map((s) => s.group))];

  return (
    <>
      <PageHeader title="Pengaturan" accent="tanpa ubah kode." description="Semua tarif, jam kerja, dan master data diatur di sini. Perubahan langsung dipakai di perhitungan berikutnya." />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g} className="flex flex-col gap-0.5">
              <p className="px-2.5 pb-1 font-mono text-[10px] tracking-[0.08em] text-fg-subtle uppercase">{g}</p>
              {sections.filter((s) => s.group === g).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={cn("flex h-9 items-center justify-between rounded-xs px-2.5 text-left text-sm", s.id === active ? "bg-brand-subtle text-fg-brand" : "text-fg-muted hover:bg-hover hover:text-fg")}
                >
                  {s.label}
                  {!s.editors.includes(user.role) && <span className="text-[10px] text-fg-subtle">lihat</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <current.Component key={current.id} readOnly={!current.editors.includes(user.role)} />
      </div>
    </>
  );
}
