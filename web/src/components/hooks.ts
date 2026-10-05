"use client";

import { useMemo } from "react";
import { dailyOvertime } from "@/lib/calc/overtime";
import { eachDay, isWeekend } from "@/lib/calc/dates";
import type { ProjectRef } from "@/lib/types";
import type { DataState } from "@/store/state";
import { useApp } from "@/store/app-provider";
import type { ComboOption } from "./ui/combobox";

export const INTERNAL: ProjectRef = { code: "INTERNAL", name: "Internal / Non-project", kind: "internal" };

/** Kode project yang bisa dipakai di timesheet & reimburse. */
export function projectRefs(s: DataState): ProjectRef[] {
  return [
    INTERNAL,
    ...s.projects
      .filter((p) => p.status !== "done" && p.status !== "cancelled")
      .map((p) => ({ code: p.code, name: p.name, kind: "project" as const })),
    ...s.opportunities
      .filter((o) => o.stage !== "lost")
      .map((o) => ({ code: o.code, name: o.name, kind: "opportunity" as const })),
  ];
}

export function useLookups() {
  const { state } = useApp();
  return useMemo(() => {
    const users = new Map(state.users.map((u) => [u.id, u]));
    const teams = new Map(state.teams.map((t) => [t.id, t]));
    const activities = new Map(state.activityCodes.map((a) => [a.id, a.name]));
    const refs = projectRefs(state);
    const allRefs = new Map<string, string>([
      [INTERNAL.code, INTERNAL.name],
      ...state.projects.map((p) => [p.code, p.name] as const),
      ...state.opportunities.map((o) => [o.code, o.name] as const),
    ]);
    const holidaySet = new Set(state.holidays.map((h) => h.date));
    const holidayName = new Map(state.holidays.map((h) => [h.date, h.name]));
    const projectOptions: ComboOption[] = refs.map((r) => ({
      value: r.code,
      label: `${r.code} — ${r.name}`,
      hint: r.kind === "opportunity" ? "Opportunity" : r.kind === "project" ? "Project" : undefined,
    }));
    const userOptions: ComboOption[] = state.users
      .filter((u) => u.active)
      .map((u) => ({ value: u.id, label: u.name, hint: teams.get(u.teamId)?.name }));
    return {
      userName: (id: string | null) => (id ? (users.get(id)?.name ?? "-") : "-"),
      user: (id: string) => users.get(id),
      teamName: (id: string) => teams.get(id)?.name ?? "-",
      activityName: (id: string) => activities.get(id) ?? id,
      projectName: (code: string) => allRefs.get(code) ?? code,
      isHoliday: (date: string) => holidaySet.has(date) || isWeekend(date, state.settings.work.workdaysPerWeek),
      holidayName: (date: string) => holidayName.get(date),
      holidaySet,
      projectOptions,
      userOptions,
    };
  }, [state]);
}

/** Tanggal cuti yang sudah disetujui milik user. */
export function approvedLeaveDates(s: DataState, userId: string): Set<string> {
  const out = new Set<string>();
  for (const r of s.leaveRequests) {
    if (r.userId === userId && r.status === "approved") eachDay(r.startDate, r.endDate).forEach((d) => out.add(d));
  }
  return out;
}

export type DaySummary = { date: string; workedMinutes: number; normalMinutes: number; overtimeMinutes: number; isHoliday: boolean };

/** Ringkasan jam per hari untuk user dalam rentang tanggal. */
export function daySummaries(s: DataState, userId: string, dates: string[], isHoliday: (d: string) => boolean): DaySummary[] {
  return dates.map((date) => {
    const entries = s.timesheet.filter((e) => e.userId === userId && e.date === date);
    const holiday = isHoliday(date);
    return { date, isHoliday: holiday, ...dailyOvertime(entries, s.settings.work.normalHoursPerDay, holiday) };
  });
}
