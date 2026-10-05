"use client";

import Link from "next/link";
import { addDays, eachDay, startOfWeek } from "@/lib/calc/dates";
import { formatDate, formatDuration, formatPeriod, formatRupiah } from "@/lib/format";
import { STAGES } from "@/lib/mock/sales";
import { isLate, isNearlyDone, projectProgress } from "@/lib/projects";
import { useAuthed } from "@/store/app-provider";
import { daySummaries, useLookups } from "../hooks";
import { slipTotals } from "../payroll/run-table";
import { pendingFor } from "../shell/pending";
import { Badge, Stat } from "../ui/display";
import { ActionTile, BarList, MiniList, Panel } from "./widgets";

export function ActionSection() {
  const { state, actor } = useAuthed();
  const p = pendingFor(state, actor);
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <ActionTile label="Cuti" count={p.leave} href="/approvals" />
      <ActionTile label="Lembur" count={p.overtime} href="/approvals" />
      <ActionTile label="Reimburse" count={p.reimburse} href="/approvals" />
      <ActionTile label="Payroll" count={p.payroll} href="/payroll" />
    </section>
  );
}

export function ProjectSalesSection() {
  const { state, today } = useAuthed();
  const { teamName } = useLookups();
  const active = state.projects.filter((p) => p.status === "ongoing" || p.status === "review" || p.status === "not_started");
  const prog = (id: string) => projectProgress(id, state.tasks, state.boardColumns);
  const late = state.projects.filter((p) => isLate(p, today));
  const nearly = active.filter((p) => isNearlyDone(p, prog(p.id), today));
  const open = state.opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");
  const closed = state.opportunities.filter((o) => o.stage === "won" || o.stage === "lost");
  const winRate = closed.length ? Math.round((closed.filter((o) => o.stage === "won").length / closed.length) * 100) : 0;
  const closingThisMonth = open.filter((o) => o.expectedClose.startsWith(today.slice(0, 7)));
  const ready = state.opportunities.filter((o) => o.stage === "won" && !state.projects.some((p) => p.opportunityId === o.id));
  const projectItem = (p: (typeof active)[number]) => ({
    key: p.id,
    left: <Link href={`/projects/${p.id}`} className="hover:text-fg-brand"><span className="font-mono text-xs text-fg-brand">{p.code}</span> {p.name}</Link>,
    right: `${prog(p.id)}% · ${formatDate(p.targetDate)}`,
  });

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Panel title="Project ongoing" aside={<Badge>{active.length}</Badge>}>
        <MiniList items={active.map((p) => ({ ...projectItem(p), right: `${p.teamIds.map(teamName).join(", ")} · ${prog(p.id)}%` }))} empty="Tidak ada project aktif." />
      </Panel>
      <Panel title="Mau selesai & terlambat">
        <MiniList items={[...late.map((p) => ({ ...projectItem(p), right: <Badge tone="danger">Terlambat</Badge> })), ...nearly.map(projectItem)]} empty="Tidak ada." />
      </Panel>
      <Panel title="Pipeline per tahap" aside={<span className="font-mono text-xs text-fg-muted">Win rate {winRate}%</span>}>
        <BarList format={formatRupiah} rows={STAGES.filter((s) => s.id !== "won" && s.id !== "lost").map((s) => ({ label: s.name, value: open.filter((o) => o.stage === s.id).reduce((a, o) => a + o.value, 0) }))} />
        <div className="border-t border-line pt-3">
          <p className="mb-1 text-xs text-fg-muted">Perkiraan closing bulan ini</p>
          <MiniList items={closingThisMonth.map((o) => ({ key: o.id, left: o.name, right: formatRupiah(o.value) }))} empty="Tidak ada." />
        </div>
        {ready.length > 0 && <Link href="/sales" className="text-xs text-fg-brand hover:underline">{ready.length} opportunity Won siap dijadikan project</Link>}
      </Panel>
    </section>
  );
}

export function PeopleSection() {
  const { state, today } = useAuthed();
  const { userName, isHoliday } = useLookups();
  const active = state.users.filter((u) => u.active);
  const weekEnd = addDays(startOfWeek(today), 6);
  const onLeave = state.leaveRequests.filter((r) => r.status === "approved" && r.startDate <= weekEnd && r.endDate >= startOfWeek(today));
  const otByTeam = state.teams.map((t) => ({
    label: t.name,
    value: state.overtimeRequests.filter((r) => r.status === "approved" && r.date >= addDays(today, -30) && state.users.find((u) => u.id === r.userId)?.teamId === t.id).reduce((s, r) => s + (r.approvedMinutes ?? 0), 0),
  }));
  const lastWorkday = [...eachDay(addDays(today, -7), addDays(today, -1))].reverse().find((d) => !isHoliday(d)) ?? today;
  const incomplete = active.filter((u) => daySummaries(state, u.id, [lastWorkday], isHoliday)[0].workedMinutes < state.settings.work.normalHoursPerDay * 60 && !onLeave.some((r) => r.userId === u.id && r.startDate <= lastWorkday && r.endDate >= lastWorkday));
  const noLeave = state.leaveBalances.filter((b) => b.used === 0);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Panel title="Pegawai aktif per tim" aside={<span className="font-serif text-2xl">{active.length}</span>}>
        <BarList format={(v) => String(v)} rows={state.teams.map((t) => ({ label: t.name, value: active.filter((u) => u.teamId === t.id).length }))} />
      </Panel>
      <Panel title="Cuti minggu ini">
        <MiniList items={onLeave.map((r) => ({ key: r.id, left: userName(r.userId), right: r.startDate <= today && r.endDate >= today ? <Badge tone="success">Hari ini</Badge> : `${formatDate(r.startDate)}–${formatDate(r.endDate)}` }))} empty="Tidak ada yang cuti." />
        <div className="border-t border-line pt-3">
          <p className="mb-1 text-xs text-fg-muted">Belum ambil cuti sama sekali tahun ini</p>
          <MiniList items={noLeave.map((b) => ({ key: b.userId, left: userName(b.userId), right: `sisa ${b.quota - b.used} hari` }))} empty="Semua sudah ambil cuti." />
        </div>
      </Panel>
      <Panel title="Jam lembur disetujui · 30 hari terakhir">
        <BarList format={formatDuration} rows={otByTeam.filter((r) => r.value > 0)} />
        <div className="border-t border-line pt-3">
          <p className="mb-1 text-xs text-fg-muted">Timesheet belum lengkap ({formatDate(lastWorkday)})</p>
          <MiniList items={incomplete.map((u) => ({ key: u.id, left: userName(u.id) }))} empty="Semua lengkap." />
        </div>
      </Panel>
    </section>
  );
}

export function FinanceSection() {
  const { state, today } = useAuthed();
  const thisMonth = state.reimbursements.filter((r) => r.date >= addDays(today, -30));
  const byCat = state.reimbursementCategories.map((c) => ({ label: c.name, value: thisMonth.filter((r) => r.categoryId === c.id && r.status !== "rejected").reduce((s, r) => s + r.amount, 0) }));
  const byProject = Object.entries(thisMonth.filter((r) => r.status !== "rejected").reduce<Record<string, number>>((a, r) => ({ ...a, [r.projectCode]: (a[r.projectCode] ?? 0) + r.amount }), {})).map(([label, value]) => ({ label, value }));
  const runs = [...state.payrollRuns].sort((a, b) => b.period.localeCompare(a.period));
  const total = (runId?: string) => state.payslips.filter((p) => p.runId === runId).reduce((s, p) => s + slipTotals(p).thp, 0);
  const [cur, prev] = runs;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Panel title="Reimburse 30 hari terakhir · per kategori">
        <BarList format={formatRupiah} rows={byCat.filter((r) => r.value > 0)} />
      </Panel>
      <Panel title="Reimburse · per project">
        <BarList format={formatRupiah} rows={byProject} />
      </Panel>
      <Panel title="Payroll">
        <div className="grid grid-cols-2 gap-4">
          <Stat label={cur ? formatPeriod(cur.period) : "-"} value={<span className="text-2xl">{formatRupiah(total(cur?.id))}</span>} />
          <Stat label={prev ? formatPeriod(prev.period) : "-"} value={<span className="text-2xl text-fg-muted">{formatRupiah(total(prev?.id))}</span>} />
        </div>
        <Link href="/payroll" className="text-xs text-fg-brand hover:underline">Buka payroll</Link>
      </Panel>
    </section>
  );
}
