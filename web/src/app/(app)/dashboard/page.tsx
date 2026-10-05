"use client";

import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { ActionSection, FinanceSection, PeopleSection, ProjectSalesSection } from "@/components/dashboard/sections";
import { MySection } from "@/components/dashboard/my-section";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";

export default function DashboardPage() {
  const { user, team, today } = useAuthed();
  const firstName = user.name.split(" ")[0];
  const role = user.role;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={`Halo, ${firstName}.`} accent={role === "stakeholder" ? "Ini ringkasan perusahaan." : "Siap kerja?"} description={formatDate(today)} />

      {role !== "employee" && (
        <div>
          <SectionTitle>Perlu tindakan saya</SectionTitle>
          <ActionSection />
        </div>
      )}

      {role === "stakeholder" && (
        <div>
          <SectionTitle>Project & sales</SectionTitle>
          <ProjectSalesSection />
        </div>
      )}

      {(role === "stakeholder" || role === "hr") && (
        <div>
          <SectionTitle>SDM</SectionTitle>
          <PeopleSection />
        </div>
      )}

      {(role === "stakeholder" || role === "finance") && (
        <div>
          <SectionTitle>Keuangan</SectionTitle>
          <FinanceSection />
        </div>
      )}

      <div>
        <SectionTitle>Pekerjaan saya</SectionTitle>
        <MySection showTasks={team?.kind === "delivery"} />
      </div>
    </div>
  );
}
