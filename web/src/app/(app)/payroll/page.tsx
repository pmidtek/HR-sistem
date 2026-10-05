"use client";

import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { formatDate, formatPeriod, formatRupiah } from "@/lib/format";
import type { Payslip } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { actOnPayroll, type PayrollAction } from "@/store/actions-business";
import { generatePayroll } from "@/store/actions-payroll";
import { useLookups } from "@/components/hooks";
import { DecisionDialog, type Decision } from "@/components/approvals/decision-dialog";
import { ManualDialog } from "@/components/payroll/manual-dialog";
import { PayslipView } from "@/components/payroll/payslip-view";
import { RunTable, slipTotals } from "@/components/payroll/run-table";
import { PageHeader } from "@/components/shell/page-header";
import { PayrollBadge, payrollStatusLabel } from "@/components/status-badge";
import { ApprovalTimeline } from "@/components/approval-timeline";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Stat } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";

const NEXT_PERIOD = "2026-10";

export default function PayrollPage() {
  const { state, actor, today, run } = useAuthed();
  const { userName } = useLookups();
  const runs = [...state.payrollRuns].sort((a, b) => b.period.localeCompare(a.period));
  const [runId, setRunId] = useState(runs[0]?.id ?? "");
  const [viewing, setViewing] = useState<Payslip | null>(null);
  const [editing, setEditing] = useState<Payslip | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);

  const current = state.payrollRuns.find((r) => r.id === runId);
  const slips = state.payslips.filter((p) => p.runId === runId);
  const prevRun = runs.find((r) => current && r.period < current.period);
  const sum = (ps: Payslip[], k: keyof ReturnType<typeof slipTotals>) => ps.reduce((s, p) => s + slipTotals(p)[k], 0);
  const prevThp = prevRun ? sum(state.payslips.filter((p) => p.runId === prevRun.id), "thp") : 0;
  const thp = sum(slips, "thp");
  const isFinance = actor.role === "finance";
  const editable = isFinance && (current?.status === "draft" || current?.status === "returned");
  const hasNext = state.payrollRuns.some((r) => r.period === NEXT_PERIOD);

  const act = (a: PayrollAction, msg: string, note?: string) => current && run((s) => actOnPayroll(s, current.id, a, actor, today, note), msg);

  function generate() {
    if (run((s) => generatePayroll(s, current && editable ? current.period : NEXT_PERIOD, actor), "Draf payroll dibuat.")) {
      setRunId(current && editable ? current.id : `pr-${NEXT_PERIOD}`);
    }
  }

  function exportCsv() {
    if (!current) return;
    const rows = [["No. Slip", "Nama", "Rekening", "Take Home Pay"], ...slips.map((p) => [p.number, userName(p.userId), "", String(slipTotals(p).thp)])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-${current.period}.csv`;
    a.click();
  }

  return (
    <>
      <PageHeader
        title="Payroll"
        accent="bulanan."
        description="Finance generate dan review, Stakeholder menyetujui. Setelah disetujui, slip terbit dan data terkunci."
        actions={
          isFinance && (!hasNext || editable) && (
            <Button iconLeft={<Icon icon={RefreshCw} />} onClick={generate}>
              {editable ? "Generate ulang" : `Generate Payroll ${formatPeriod(NEXT_PERIOD)}`}
            </Button>
          )
        }
      />

      <div className="mb-6">
        <Tabs value={runId} onChange={setRunId} tabs={runs.map((r) => ({ value: r.id, label: formatPeriod(r.period) }))} />
      </div>

      {!current ? (
        <EmptyState title="Belum ada payroll" />
      ) : (
        <div className="flex flex-col gap-6">
          <Card padding="lg" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PayrollBadge status={current.status} />
                <span className="text-sm text-fg-muted">Periode {formatDate(current.periodStart)} – {formatDate(current.periodEnd)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {isFinance && editable && <Button size="small" onClick={() => act("submit", "Payroll diajukan ke Stakeholder.")}>Ajukan ke Stakeholder</Button>}
                {isFinance && current.status === "approved" && <Button size="small" onClick={() => act("transfer", "Ditandai sudah ditransfer.")}>Tandai Sudah Ditransfer</Button>}
                {actor.role === "stakeholder" && current.status === "pending" && (
                  <>
                    <Button size="small" variant="secondary" tone="danger" onClick={() => setDecision({ title: "Kembalikan payroll", confirmLabel: "Kembalikan", tone: "danger", noteRequired: true, onConfirm: (note) => Boolean(act("return", "Payroll dikembalikan ke Finance.", note)) })}>
                      Kembalikan dengan catatan
                    </Button>
                    <Button size="small" onClick={() => act("approve", "Payroll disetujui. Slip gaji terbit.")}>Setujui</Button>
                  </>
                )}
                <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Download} size={14} />} onClick={exportCsv}>Ekspor Excel</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <Stat label="Total take home pay" value={formatRupiah(thp)} sub={prevRun ? `${thp >= prevThp ? "+" : ""}${formatRupiah(thp - prevThp)} vs ${formatPeriod(prevRun.period)}` : undefined} />
              <Stat label="Total lembur" value={formatRupiah(sum(slips, "overtime"))} />
              <Stat label="Total potongan" value={formatRupiah(sum(slips, "deductions"))} />
              <Stat label="Pegawai" value={slips.length} />
            </div>
            {current.logs.length > 0 && <ApprovalTimeline logs={current.logs} labels={payrollStatusLabel} />}
          </Card>

          <RunTable slips={slips} editable={editable} onView={setViewing} onEdit={setEditing} />
          <p className="text-xs text-fg-subtle">Rumus PPh 21 (TER) dan BPJS wajib diverifikasi Finance atau konsultan pajak sebelum go-live.</p>
        </div>
      )}

      {viewing && current && (
        <Dialog open onOpenChange={(o) => !o && setViewing(null)} title={`Slip ${viewing.number}`} width="lg">
          <PayslipView slip={viewing} run={current} />
        </Dialog>
      )}
      {editing && <ManualDialog key={editing.id} slip={editing} onClose={() => setEditing(null)} />}
      {decision && <DecisionDialog decision={decision} onClose={() => setDecision(null)} />}
    </>
  );
}
