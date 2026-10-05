"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { addDays, eachDay, fromMinutes, startOfWeek, toMinutes } from "@/lib/calc/dates";
import { entryMinutes, type EntryInput } from "@/lib/calc/timesheet";
import { formatDate, formatDayShort, formatDuration } from "@/lib/format";
import type { TimesheetEntry } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { approvedLeaveDates, daySummaries, useLookups } from "@/components/hooks";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";
import { DayView } from "@/components/timesheet/day-view";
import { EntryDialog } from "@/components/timesheet/entry-dialog";
import { WeekView } from "@/components/timesheet/week-view";
import { Button, IconButton } from "@/components/ui/button";
import { Card, Stat } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";

type View = "week" | "day";

export default function TimesheetPage() {
  const { state, user, today } = useAuthed();
  const { isHoliday, projectName } = useLookups();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(today);
  const [dialog, setDialog] = useState<{ key: number; initial: EntryInput } | null>(null);

  const mine = useMemo(() => state.timesheet.filter((e) => e.userId === user.id), [state.timesheet, user.id]);
  const leaveDates = useMemo(() => approvedLeaveDates(state, user.id), [state, user.id]);
  const weekStart = startOfWeek(anchor);
  const weekDays = eachDay(weekStart, addDays(weekStart, 6));
  const week = daySummaries(state, user.id, weekDays, isHoliday);
  const weekTotal = week.reduce((s, d) => s + d.workedMinutes, 0);
  const weekOvertime = week.reduce((s, d) => s + d.overtimeMinutes, 0);

  const monthPrefix = anchor.slice(0, 7);
  const monthDays = [...new Set(mine.filter((e) => e.date.startsWith(monthPrefix)).map((e) => e.date))];
  const month = daySummaries(state, user.id, monthDays, isHoliday);
  const perProject = Object.entries(
    mine
      .filter((e) => e.date.startsWith(monthPrefix))
      .reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.projectCode]: (acc[e.projectCode] ?? 0) + entryMinutes(e) }), {}),
  ).sort((a, b) => b[1] - a[1]);

  const openNew = (date: string, start = "09:00") =>
    setDialog({
      key: Date.now(),
      initial: { date, start, end: fromMinutes(Math.min(toMinutes(start) + 60, 24 * 60)), projectCode: "", activityId: "", description: "" },
    });
  const openEdit = (e: TimesheetEntry) => setDialog({ key: Date.now(), initial: { ...e } });

  const step = view === "week" ? 7 : 1;

  return (
    <>
      <PageHeader
        title="Timesheet"
        accent="minggu ini."
        description="Catat pekerjaan per blok waktu. Jam di atas batas normal otomatis dihitung lembur."
        actions={<Button iconLeft={<Icon icon={Plus} />} onClick={() => openNew(anchor > today ? today : anchor)}>Tambah entri</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs variant="pill" value={view} onChange={setView} tabs={[{ value: "week", label: "Mingguan" }, { value: "day", label: "Harian" }]} />
        <div className="flex items-center gap-1">
          <IconButton label="Sebelumnya" size="small" onClick={() => setAnchor(addDays(anchor, -step))}>
            <Icon icon={ChevronLeft} />
          </IconButton>
          <IconButton label="Berikutnya" size="small" onClick={() => setAnchor(addDays(anchor, step))}>
            <Icon icon={ChevronRight} />
          </IconButton>
          <Button variant="ghost" tone="neutral" size="small" onClick={() => setAnchor(today)}>
            Hari ini
          </Button>
        </div>
        <p className="font-display text-sm text-fg">
          {view === "week" ? `${formatDate(weekDays[0])} – ${formatDate(weekDays[6])}` : formatDayShort(anchor)}
        </p>
        <div className="ml-auto flex gap-4 font-mono text-xs text-fg-muted">
          <span>Total {formatDuration(weekTotal)}</span>
          <span className="text-fg-brand">Lembur {formatDuration(weekOvertime)}</span>
        </div>
      </div>

      {view === "week" ? (
        <WeekView days={week} entries={mine} leaveDates={leaveDates} today={today} onAdd={openNew} onEdit={openEdit} />
      ) : (
        <DayView
          entries={mine.filter((e) => e.date === anchor)}
          normalHours={state.settings.work.normalHoursPerDay}
          isHoliday={isHoliday(anchor)}
          onEdit={openEdit}
          onAddAt={(start) => openNew(anchor, start)}
        />
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card padding="lg" className="grid grid-cols-2 gap-6">
          <Stat label="Jam normal bulan ini" value={formatDuration(month.reduce((s, d) => s + d.normalMinutes, 0))} sub={`Target ${state.settings.work.monthlyTargetHours} jam`} />
          <Stat label="Jam lembur bulan ini" value={formatDuration(month.reduce((s, d) => s + d.overtimeMinutes, 0))} sub="Belum tentu disetujui" />
        </Card>
        <Card padding="lg">
          <SectionTitle>Jam per project bulan ini</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {perProject.length === 0 && <p className="text-xs text-fg-muted">Belum ada entri.</p>}
            {perProject.map(([code, mins]) => {
              const total = perProject.reduce((s, [, m]) => s + m, 0);
              return (
                <div key={code} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 font-mono text-xs text-fg-brand">{code}</span>
                  <span className="hidden w-48 truncate text-xs text-fg-muted sm:block">{projectName(code)}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-hover">
                    <span className="block h-full rounded-pill bg-brand" style={{ width: `${(mins / total) * 100}%` }} />
                  </span>
                  <span className="w-16 text-right font-mono text-xs">{formatDuration(mins)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {dialog && <EntryDialog key={dialog.key} open onOpenChange={(o) => !o && setDialog(null)} initial={dialog.initial} />}
    </>
  );
}
