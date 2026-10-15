"use client";

import { useState, type ComponentType } from "react";
import { isReleased, type Feature } from "@/lib/access";
import type { Role } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { PageHeader } from "@/components/shell/page-header";
import { CompanyForm, OvertimeForm, PayrollForm, ReimburseForm, WorkForm } from "@/components/settings/general-forms";
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
  /** Modul yang memakai pengaturan ini; disembunyikan jika belum dirilis. */
  feature?: Feature;
};

const sections: Section[] = ([
  { id: "reimburse", label: "Reimbursement payment", group: "Reimbursement", editors: ["finance", "stakeholder"], Component: ReimburseForm },
  { id: "categories", label: "Categories", group: "Reimbursement", editors: ["finance", "stakeholder"], Component: CategoryList },
  { id: "holidays", label: "Holidays", group: "Company", editors: ["hr", "stakeholder"], Component: HolidayList },
  { id: "teams", label: "Teams", group: "Company", editors: ["hr", "stakeholder"], Component: TeamList },
  { id: "company", label: "Company", group: "Company", editors: ["hr", "finance", "stakeholder"], Component: CompanyForm },
  // Muncul lagi saat modulnya dirilis (lihat releasedFeatures di lib/access.ts).
  { id: "work", label: "Working hours", group: "HR", editors: ["hr", "stakeholder"], Component: WorkForm, feature: "timesheet" },
  { id: "leave", label: "Leave types", group: "HR", editors: ["hr", "stakeholder"], Component: LeaveTypeList, feature: "leave" },
  { id: "activity", label: "Activity codes", group: "HR", editors: ["hr", "stakeholder"], Component: ActivityList, feature: "timesheet" },
  { id: "overtime", label: "Overtime formula", group: "Payroll", editors: ["finance", "stakeholder"], Component: OvertimeForm, feature: "overtime" },
  { id: "payroll", label: "Payroll period", group: "Payroll", editors: ["finance", "stakeholder"], Component: PayrollForm, feature: "payroll" },
  { id: "bpjs", label: "BPJS rates", group: "Payroll", editors: ["finance", "stakeholder"], Component: BpjsTable, feature: "payroll" },
  { id: "ter", label: "PPh 21 TER", group: "Payroll", editors: ["finance", "stakeholder"], Component: TerTable, feature: "payroll" },
] satisfies Section[]).filter((s) => !s.feature || isReleased(s.feature));

export default function SettingsPage() {
  const { user } = useAuthed();
  const [active, setActive] = useState(() => sections.find((s) => s.editors.includes(user.role))?.id ?? "reimburse");
  const current = sections.find((s) => s.id === active) ?? sections[0];
  const groups = [...new Set(sections.map((s) => s.group))];

  return (
    <>
      <PageHeader title="Settings" description="Rates, schedules, and master data. Changes apply to the next calculation." />
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
                  {!s.editors.includes(user.role) && <span className="text-[10px] text-fg-subtle">view</span>}
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
