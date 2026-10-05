"use client";

import { toMinutes } from "@/lib/calc/dates";
import { overtimePerEntry } from "@/lib/calc/overtime";
import { formatDuration } from "@/lib/format";
import type { TimesheetEntry } from "@/lib/types";
import { useLookups } from "../hooks";

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_PX = 52;

type Props = {
  entries: TimesheetEntry[];
  normalHours: number;
  isHoliday: boolean;
  onEdit: (entry: TimesheetEntry) => void;
  onAddAt: (start: string) => void;
};

/** Timeline harian: terlihat jam yang kosong dan yang terisi. */
export function DayView({ entries, normalHours, isHoliday, onEdit, onAddAt }: Props) {
  const { activityName, projectName } = useLookups();
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const sorted = [...entries].sort((a, b) => a.start.localeCompare(b.start));

  const overtime = overtimePerEntry(sorted, normalHours, isHoliday);
  const blocks = sorted.map((e, i) => ({ entry: e, len: toMinutes(e.end) - toMinutes(e.start), overtimePart: overtime[i] }));

  return (
    <div className="relative rounded-s glass shadow-[inset_0_0_0_1px_var(--border-default)]">
      <div className="relative" style={{ height: hours.length * HOUR_PX }}>
        {hours.map((h, i) => (
          <button
            key={h}
            type="button"
            onClick={() => onAddAt(`${String(h).padStart(2, "0")}:00`)}
            className="absolute right-0 left-0 flex border-t border-line text-left hover:bg-hover"
            style={{ top: i * HOUR_PX, height: HOUR_PX }}
            aria-label={`Tambah entri jam ${h}:00`}
          >
            <span className="w-16 shrink-0 px-3 pt-1 font-mono text-[10px] text-fg-subtle">{String(h).padStart(2, "0")}:00</span>
          </button>
        ))}
        {blocks.map(({ entry: e, len, overtimePart }) => {
          const top = ((toMinutes(e.start) - START_HOUR * 60) / 60) * HOUR_PX;
          const height = (len / 60) * HOUR_PX;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onEdit(e)}
              className="absolute right-3 left-16 flex flex-col overflow-hidden rounded-xs bg-brand-subtle px-3 py-1.5 text-left shadow-[inset_3px_0_0_var(--brand)] hover:brightness-110"
              style={{ top: top + 1, height: height - 2 }}
            >
              <span className="flex items-center gap-2 font-mono text-[11px] text-fg-brand">
                {e.start}–{e.end} · {e.projectCode}
                {overtimePart > 0 && <span className="rounded-xxs bg-brand px-1 text-[10px] text-fg-on-brand">lembur {formatDuration(overtimePart)}</span>}
              </span>
              <span className="truncate text-sm text-fg">{e.description}</span>
              {height > 60 && (
                <span className="text-xs text-fg-muted">
                  {activityName(e.activityId)} · {projectName(e.projectCode)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
