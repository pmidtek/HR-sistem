"use client";

import { useMemo, useState } from "react";
import { eachDay, endOfMonth, isWeekend, parseDate } from "@/lib/calc/dates";
import { entryMinutes } from "@/lib/calc/timesheet";
import { cn } from "@/lib/cn";
import { formatHours, formatPeriod } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { daySummaries, useLookups } from "@/components/hooks";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/display";
import { Select } from "@/components/ui/form";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default function TimesheetRecapPage() {
  const { state, today } = useAuthed();
  const { isHoliday, projectName, teamName } = useLookups();
  const months = [...new Set(state.timesheet.map((e) => e.date.slice(0, 7)))].sort().reverse();
  const [month, setMonth] = useState(months[0] ?? today.slice(0, 7));
  const [teamId, setTeamId] = useState("");
  const [project, setProject] = useState("");
  const [activity, setActivity] = useState("");

  const monthStart = `${month}-01`;
  const monthEnd = endOfMonth(month);
  const days = eachDay(monthStart, monthEnd < today ? monthEnd : today);
  // Target dihitung sampai kemarin; hari ini belum selesai.
  const workdays = days.filter((d) => d < today && !isHoliday(d));
  const targetSoFar = workdays.length * state.settings.work.normalHoursPerDay * 60;

  const filtered = useMemo(
    () => state.timesheet.filter((e) => e.date.startsWith(month) && (!project || e.projectCode === project) && (!activity || e.activityId === activity)),
    [state.timesheet, month, project, activity],
  );
  const people = state.users.filter((u) => u.active && (!teamId || u.teamId === teamId));
  const byProject = Object.entries(filtered.reduce<Record<string, number>>((a, e) => ({ ...a, [e.projectCode]: (a[e.projectCode] ?? 0) + entryMinutes(e) }), {})).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader title="Rekap" accent="timesheet." description="Total jam per pegawai per hari. Pegawai yang jam normalnya di bawah target ditandai." />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Select label="Periode" value={month} onChange={(e) => setMonth(e.target.value)} options={months.map((m) => ({ value: m, label: formatPeriod(m) }))} />
        <Select label="Tim" value={teamId} placeholder="Semua tim" onChange={(e) => setTeamId(e.target.value)} options={state.teams.map((t) => ({ value: t.id, label: t.name }))} />
        <Select label="Project" value={project} placeholder="Semua project" onChange={(e) => setProject(e.target.value)} options={[...new Set(state.timesheet.map((e) => e.projectCode))].map((c) => ({ value: c, label: `${c} — ${projectName(c)}` }))} />
        <Select label="Activity" value={activity} placeholder="Semua activity" onChange={(e) => setActivity(e.target.value)} options={state.activityCodes.map((a) => ({ value: a.id, label: a.name }))} />
      </div>

      <Table>
        <thead>
          <tr>
            <Th className="sticky left-0 z-10 min-w-48">Pegawai</Th>
            {days.map((d) => (
              <Th key={d} className={cn("px-2 text-center", isHoliday(d) && "text-fg-danger")}>
                {parseDate(d).getUTCDate()}
              </Th>
            ))}
            <Th className="text-right">Normal</Th>
            <Th className="text-right">Lembur</Th>
          </tr>
        </thead>
        <tbody>
          {people.map((u) => {
            const sums = daySummaries({ ...state, timesheet: filtered }, u.id, days, isHoliday);
            const normal = sums.reduce((s, d) => s + d.normalMinutes, 0);
            const ot = sums.reduce((s, d) => s + d.overtimeMinutes, 0);
            const under = !project && !activity && normal < targetSoFar;
            return (
              <Tr key={u.id}>
                <Td className="sticky left-0 z-10 bg-raised">
                  <p className="text-sm">{u.name}</p>
                  <p className="text-xs text-fg-subtle">{teamName(u.teamId)}</p>
                </Td>
                {sums.map((d) => (
                  <Td key={d.date} className={cn("px-2 text-center font-mono text-xs", isWeekend(d.date) && "bg-sunken", d.overtimeMinutes > 0 && "text-fg-brand", d.workedMinutes === 0 && "text-fg-subtle")}>
                    {d.workedMinutes > 0 ? formatHours(d.workedMinutes) : "·"}
                  </Td>
                ))}
                <Td className="text-right font-mono text-xs">
                  {under ? <Badge tone="danger">{formatHours(normal)}</Badge> : formatHours(normal)}
                </Td>
                <Td className="text-right font-mono text-xs text-fg-brand">{formatHours(ot)}</Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      <p className="mt-2 text-xs text-fg-subtle">
        Target sampai kemarin: {formatHours(targetSoFar)} jam ({workdays.length} hari kerja × {state.settings.work.normalHoursPerDay} jam).
      </p>

      <div className="mt-8">
        <SectionTitle>Jam per project</SectionTitle>
        <Table>
          <thead><tr><Th>Kode</Th><Th>Nama</Th><Th className="text-right">Total jam</Th></tr></thead>
          <tbody>
            {byProject.map(([code, mins]) => (
              <Tr key={code}>
                <Td className="font-mono text-fg-brand">{code}</Td>
                <Td>{projectName(code)}</Td>
                <Td className="text-right font-mono">{formatHours(mins)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
