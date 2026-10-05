"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { formatPeriod, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useAuthed } from "@/store/app-provider";
import { PayslipView } from "@/components/payroll/payslip-view";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";

export default function PayslipsPage() {
  const { state, user } = useAuthed();
  const released = new Set(state.payrollRuns.filter((r) => r.status === "approved" || r.status === "transferred").map((r) => r.id));
  const mine = state.payslips.filter((p) => p.userId === user.id && released.has(p.runId)).reverse();
  const [selectedId, setSelectedId] = useState(mine[0]?.id);
  const slip = mine.find((p) => p.id === selectedId);
  const run = state.payrollRuns.find((r) => r.id === slip?.runId);
  const thp = (id: string) => {
    const p = state.payslips.find((x) => x.id === id);
    return p ? p.lines.reduce((s, l) => s + (l.kind === "earning" ? l.amount : -l.amount), 0) : 0;
  };

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Slip Gaji"
          accent="milik Anda."
          description="Slip tersedia setelah payroll disetujui Stakeholder."
          actions={slip && <Button iconLeft={<Icon icon={Download} />} onClick={() => window.print()}>Unduh / Cetak PDF</Button>}
        />
      </div>
      {mine.length === 0 ? (
        <EmptyState title="Belum ada slip gaji" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="flex flex-col gap-1.5 print:hidden">
            {mine.map((p) => {
              const r = state.payrollRuns.find((x) => x.id === p.runId);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "flex flex-col items-start rounded-xs px-3 py-2.5 text-left shadow-[inset_0_0_0_1px_var(--border-default)]",
                    p.id === selectedId ? "bg-brand-subtle shadow-[inset_0_0_0_1px_var(--brand)]" : "hover:bg-hover",
                  )}
                >
                  <span className="text-sm">{r ? formatPeriod(r.period) : p.number}</span>
                  <span className="font-mono text-xs text-fg-muted">{formatRupiah(thp(p.id))}</span>
                </button>
              );
            })}
          </div>
          <div className="overflow-x-auto">{slip && run && <PayslipView slip={slip} run={run} />}</div>
        </div>
      )}
    </>
  );
}
