"use client";

import { isReleased } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { ActionSection, FinanceSection, PeopleSection, ProjectSection } from "@/components/dashboard/sections";
import { MySection } from "@/components/dashboard/my-section";
import { ReimburseCompanySection, ReimburseMineSection } from "@/components/dashboard/reimburse-section";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";
import { CountUpScope } from "@/components/ui/motion";

/**
 * Dashboard. Saat ini hanya modul Reimburse yang dirilis; bagian lain muncul lagi
 * ketika modulnya masuk releasedFeatures (lib/access.ts).
 */
export default function DashboardPage() {
  const { user, team, today } = useAuthed();
  const firstName = user.name.split(" ")[0];
  const role = user.role;
  const full = isReleased("timesheet") && isReleased("leave") && isReleased("payroll");

  return (
    <CountUpScope id="dashboard">
      <div className="flex flex-col gap-10">
        <PageHeader title={`Hi, ${firstName}.`} description={formatDate(today)} />

        {role === "employee" ? <ReimburseMineSection /> : <ReimburseCompanySection />}

        {full && role !== "employee" && (
          <div>
            <SectionTitle>Other requests</SectionTitle>
            <ActionSection />
          </div>
        )}
        {full && role === "stakeholder" && isReleased("projects") && (
          <div>
            <SectionTitle>Projects</SectionTitle>
            <ProjectSection />
          </div>
        )}
        {full && (role === "stakeholder" || role === "hr") && (
          <div>
            <SectionTitle>People</SectionTitle>
            <PeopleSection />
          </div>
        )}
        {full && (role === "stakeholder" || role === "finance") && (
          <div>
            <SectionTitle>Finance</SectionTitle>
            <FinanceSection />
          </div>
        )}
        {full && (
          <div>
            <SectionTitle>My work</SectionTitle>
            <MySection showTasks={team?.kind === "delivery" && isReleased("projects")} delay={0.24} />
          </div>
        )}
      </div>
    </CountUpScope>
  );
}
