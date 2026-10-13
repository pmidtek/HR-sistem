"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { DistributionCards, HoursCards, SprintReportCard } from "@/components/projects/analytics/breakdown-cards";
import { SCurveCard } from "@/components/projects/analytics/s-curve-card";
import { useProjectData } from "@/components/projects/use-project-data";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function AnalyticsPage() {
  const { base } = useProject();
  const data = useProjectData();
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Analytics"
        description="Rencana vs realisasi, laporan sprint, distribusi task, dan jam kerja dari timesheet."
        actions={<Link href={`${base}/analytics/report`} className={buttonClass({ size: "small" })}><Icon icon={FileText} size={14} /> Generate report</Link>}
      />
      <SCurveCard data={data} />
      <SprintReportCard data={data} />
      <DistributionCards data={data} />
      <HoursCards />
    </div>
  );
}
