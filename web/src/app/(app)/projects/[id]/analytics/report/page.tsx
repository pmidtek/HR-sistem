"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { ProjectReport } from "@/components/projects/analytics/project-report";
import { useProjectData } from "@/components/projects/use-project-data";
import { useProject } from "@/components/projects/workspace/context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function ProjectReportPage() {
  const { base } = useProject();
  const data = useProjectData();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`${base}/analytics`} className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"><Icon icon={ArrowLeft} size={14} /> Analytics</Link>
        <Button size="small" iconLeft={<Icon icon={Printer} size={14} />} onClick={() => window.print()}>Cetak / simpan PDF</Button>
      </div>
      <ProjectReport data={data} />
    </div>
  );
}
