"use client";

import { Lock, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDuration, dayName } from "@/lib/format";
import { parseDate } from "@/lib/calc/dates";
import type { TimesheetEntry } from "@/lib/types";
import { useLookups, type DaySummary } from "../hooks";
import { Badge } from "../ui/display";
import { Icon } from "../ui/icon";

type Props = {
  days: DaySummary[];
  entries: TimesheetEntry[];
  leaveDates: Set<string>;
  today: string;
  onAdd: (date: string) => void;
  onEdit: (entry: TimesheetEntry) => void;
};

export function WeekView({ days, entries, leaveDates, today, onAdd, onEdit }: Props) {
  const { activityName, holidayName } = useLookups();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
      {days.map((d) => {
        const list = entries.filter((e) => e.date === d.date).sort((a, b) => a.start.localeCompare(b.start));
        const isToday = d.date === today;
        const onLeave = leaveDates.has(d.date);
        const future = d.date > today;
        const hName = holidayName(d.date);
        return (
          <div
            key={d.date}
            className={cn(
              "flex min-h-56 flex-col rounded-s bg-raised shadow-[inset_0_0_0_1px_var(--border-default)]",
              isToday && "shadow-[inset_0_0_0_1px_var(--brand)]",
              (d.isHoliday || onLeave) && "bg-sunken",
            )}
          >
            <div className="flex items-start justify-between border-b border-line px-3 py-2.5">
              <div>
                <p className={cn("font-mono text-[10px] tracking-[0.08em] uppercase", isToday ? "text-fg-brand" : "text-fg-subtle")}>
                  {dayName(d.date)}
                </p>
                <p className="font-display text-lg leading-tight">{parseDate(d.date).getUTCDate()}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-fg">{d.workedMinutes > 0 ? formatDuration(d.workedMinutes) : "-"}</p>
                {d.overtimeMinutes > 0 && <p className="font-mono text-[10px] text-fg-brand">+{formatDuration(d.overtimeMinutes)} lembur</p>}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-2">
              {onLeave && <Badge tone="success">Cuti</Badge>}
              {hName && <Badge tone="danger">{hName}</Badge>}
              {list.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onEdit(e)}
                  className="flex flex-col gap-0.5 rounded-xs bg-canvas px-2 py-1.5 text-left shadow-[inset_0_0_0_1px_var(--border-default)] transition-colors hover:shadow-[inset_0_0_0_1px_var(--border-strong)]"
                >
                  <span className="flex items-center justify-between gap-1 font-mono text-[10px] text-fg-subtle">
                    {e.start}–{e.end}
                    {e.locked && <Icon icon={Lock} size={10} />}
                  </span>
                  <span className="truncate font-mono text-[11px] text-fg-brand">{e.projectCode}</span>
                  <span className="line-clamp-2 text-xs text-fg">{e.description}</span>
                  <span className="text-[10px] text-fg-subtle">{activityName(e.activityId)}</span>
                </button>
              ))}
              {!future && !onLeave && (
                <button
                  type="button"
                  onClick={() => onAdd(d.date)}
                  className="mt-auto flex h-8 items-center justify-center gap-1 rounded-xs text-xs text-fg-subtle hover:bg-hover hover:text-fg"
                >
                  <Icon icon={Plus} size={14} /> Tambah
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
