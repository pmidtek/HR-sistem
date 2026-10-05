"use client";

import Link from "next/link";
import { addDays, eachDay, startOfWeek } from "@/lib/calc/dates";
import { formatDayShort, formatDuration, formatPeriod, formatRupiah } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { daySummaries, useLookups } from "../hooks";
import { slipTotals } from "../payroll/run-table";
import { MyTasks } from "../projects/my-tasks";
import { ApprovalBadge, ReimburseBadge } from "../status-badge";
import { Card, Stat } from "../ui/display";
import { MiniList, Panel } from "./widgets";

/** Ringkasan pribadi: dipakai semua role (pegawai melihat ini sebagai dashboard utama). */
export function MySection({ showTasks }: { showTasks: boolean }) {
  const { state, user, today } = useAuthed();
  const { isHoliday } = useLookups();
  const week = daySummaries(state, user.id, eachDay(startOfWeek(today), addDays(startOfWeek(today), 6)), isHoliday);
  const worked = week.reduce((s, d) => s + d.workedMinutes, 0);
  const overtime = week.reduce((s, d) => s + d.overtimeMinutes, 0);
  const bal = state.leaveBalances.find((b) => b.userId === user.id && b.leaveTypeId === "annual");
  const released = state.payrollRuns.filter((r) => r.status === "approved" || r.status === "transferred").sort((a, b) => b.period.localeCompare(a.period));
  const lastSlip = state.payslips.find((p) => p.userId === user.id && p.runId === released[0]?.id);
  const pending = [
    ...state.leaveRequests.filter((r) => r.userId === user.id && r.status.startsWith("pending")).map((r) => ({ key: r.id, left: `Cuti ${formatDayShort(r.startDate)}`, right: <ApprovalBadge status={r.status} /> })),
    ...state.overtimeRequests.filter((r) => r.userId === user.id && r.status.startsWith("pending")).map((r) => ({ key: r.id, left: `Lembur ${formatDayShort(r.date)}`, right: <ApprovalBadge status={r.status} /> })),
    ...state.reimbursements.filter((r) => r.userId === user.id && !["paid", "rejected"].includes(r.status)).map((r) => ({ key: r.id, left: `Reimburse ${formatRupiah(r.amount)}`, right: <ReimburseBadge status={r.status} /> })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card padding="lg" className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Link href="/timesheet"><Stat label="Jam kerja minggu ini" value={formatDuration(worked)} sub={overtime > 0 ? `${formatDuration(overtime)} lembur` : "tanpa lembur"} /></Link>
        <Link href="/leave"><Stat label="Sisa cuti tahunan" value={bal ? bal.quota - bal.used : 0} sub={`dari ${bal?.quota ?? 0} hari`} /></Link>
        <Stat label="Pengajuan berjalan" value={pending.length} />
        <Link href="/payslips"><Stat label={lastSlip ? `Gaji ${formatPeriod(released[0].period)}` : "Slip gaji"} value={<span className="text-3xl">{lastSlip ? formatRupiah(slipTotals(lastSlip).thp) : "-"}</span>} /></Link>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Status pengajuan saya">
          <MiniList items={pending} empty="Tidak ada pengajuan yang sedang berjalan." />
        </Panel>
        {showTasks && (
          <Panel title="Task saya">
            <MyTasks />
          </Panel>
        )}
      </div>
    </div>
  );
}
