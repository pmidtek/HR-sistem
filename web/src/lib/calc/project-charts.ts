/** Data grafik project: burndown, velocity, S-curve, sprint report, baseline. Semua murni & teruji. */
import type { Baseline, ChangeRequest, Sprint } from "../project-types";
import type { Task } from "../types";
import { addDays, diffDays, eachDay } from "./dates";

const doneBy = (t: Task, date: string) => t.completedAt !== null && t.completedAt.slice(0, 10) <= date;

export type BurndownPoint = { date: string; ideal: number; actual: number | null };

/**
 * Burndown sprint: garis ideal (N → 0 linier) dan sisa task aktual per hari.
 * N = task yang direncanakan (snapshot saat mulai; jika belum mulai, task dengan sprintId ini).
 * Aktual hanya sampai hari ini.
 */
export function burndown(sprint: Sprint, tasks: Task[], today: string): BurndownPoint[] {
  const planned = sprint.plannedTaskIds.length
    ? tasks.filter((t) => sprint.plannedTaskIds.includes(t.id))
    : tasks.filter((t) => t.sprintId === sprint.id);
  const n = planned.length;
  const days = eachDay(sprint.startDate, sprint.endDate);
  const span = Math.max(1, days.length - 1);
  return days.map((date, i) => ({
    date,
    ideal: Math.round((n - (n * i) / span) * 10) / 10,
    actual: date <= today ? n - planned.filter((t) => doneBy(t, date)).length : null,
  }));
}

export type VelocityBar = { sprintId: string; name: string; planned: number; completed: number };

/** Velocity: per sprint selesai, task direncanakan vs task rencana yang selesai sebelum akhir sprint. */
export function velocity(sprints: Sprint[], tasks: Task[]): VelocityBar[] {
  return sprints
    .filter((s) => s.status === "completed")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((s) => {
      const planned = tasks.filter((t) => s.plannedTaskIds.includes(t.id));
      return { sprintId: s.id, name: s.name, planned: planned.length, completed: planned.filter((t) => doneBy(t, s.endDate)).length };
    });
}

export type SprintReport = { planned: number; completed: number; carriedOver: number; added: number };

export function sprintReport(sprint: Sprint, tasks: Task[]): SprintReport {
  const plannedIds = new Set(sprint.plannedTaskIds);
  const planned = tasks.filter((t) => plannedIds.has(t.id));
  const completed = planned.filter((t) => doneBy(t, sprint.endDate)).length;
  return {
    planned: planned.length,
    completed,
    carriedOver: planned.length - completed,
    added: tasks.filter((t) => t.sprintId === sprint.id && !plannedIds.has(t.id)).length,
  };
}

/** Titik mingguan dari start (termasuk) sampai minggu yang memuat end. */
export function weeklyDates(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 7)) out.push(d);
  if (out[out.length - 1] < end) out.push(addDays(out[out.length - 1], 7));
  return out;
}

/** Rencana kumulatif dari deadline task (task tanpa deadline dianggap selesai di target project). */
export function buildBaselinePoints(tasks: Task[], start: string, target: string): { date: string; percent: number }[] {
  const n = tasks.length || 1;
  return weeklyDates(start, target).map((date) => ({
    date,
    percent: Math.round((tasks.filter((t) => (t.deadline ?? target) <= date).length / n) * 100),
  }));
}

/** Nilai rencana di tanggal tertentu: interpolasi linier antar titik baseline. */
export function plannedAt(points: { date: string; percent: number }[], date: string): number {
  if (points.length === 0) return 0;
  if (date <= points[0].date) return points[0].percent;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (date <= b.date) {
      const span = diffDays(a.date, b.date) || 1;
      return a.percent + ((b.percent - a.percent) * diffDays(a.date, date)) / span;
    }
  }
  return points[points.length - 1].percent;
}

export type SCurvePoint = { date: string; planned: number; actual: number | null; revised: number };

/**
 * S-curve mingguan.
 * - Planned: dari baseline.
 * - Actual: % task selesai (hanya sampai hari ini).
 * - Revised: rencana yang "diregangkan" sebanyak total dampak hari CR yang disetujui/diimplementasikan.
 */
export function sCurve(baseline: Baseline, tasks: Task[], changes: ChangeRequest[], today: string): SCurvePoint[] {
  const start = baseline.plannedPoints[0]?.date ?? today;
  const end = baseline.plannedPoints[baseline.plannedPoints.length - 1]?.date ?? today;
  const extra = changes.filter((c) => c.status === "approved" || c.status === "implemented").reduce((s, c) => s + c.impactDays, 0);
  const duration = Math.max(1, diffDays(start, end));
  const last = [end, addDays(end, extra), today].sort()[2];
  const n = tasks.length || 1;
  return weeklyDates(start, last).map((date) => {
    const elapsed = diffDays(start, date);
    const stretched = addDays(start, Math.round((elapsed * duration) / (duration + extra)));
    return {
      date,
      planned: Math.round(plannedAt(baseline.plannedPoints, date)),
      actual: date <= today ? Math.round((tasks.filter((t) => doneBy(t, date)).length / n) * 100) : null,
      revised: Math.round(plannedAt(baseline.plannedPoints, stretched)),
    };
  });
}

/** Scope creep: jumlah task bertambah lebih dari 10% sejak baseline. */
export function isScopeCreep(baselineTaskCount: number, currentTaskCount: number): boolean {
  return baselineTaskCount > 0 && (currentTaskCount - baselineTaskCount) / baselineTaskCount > 0.1;
}
