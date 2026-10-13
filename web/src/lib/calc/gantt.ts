/** Logic murni Gantt: rentang tanggal, posisi bar, dan geser/ubah durasi lewat drag. */
import { addDays, diffDays } from "./dates";

export type GanttZoom = "day" | "week" | "month";

/** Lebar 1 hari (px) per tingkat zoom. */
export const DAY_WIDTH: Record<GanttZoom, number> = { day: 36, week: 14, month: 5 };

export type Span = { start: string; end: string };

/** Rentang bar task. Hanya satu tanggal → bar satu hari. Tanpa tanggal → null (belum dijadwalkan). */
export function taskSpan(t: { startDate: string | null; deadline: string | null }): Span | null {
  const start = t.startDate ?? t.deadline;
  const end = t.deadline ?? t.startDate;
  if (!start || !end) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

/** Rentang tampilan: semua tanggal yang relevan + jeda `pad` hari di kiri & kanan. */
export function ganttRange(dates: string[], pad = 3): Span {
  const sorted = dates.filter(Boolean).sort();
  if (sorted.length === 0) throw new Error("Tidak ada tanggal untuk Gantt.");
  return { start: addDays(sorted[0], -pad), end: addDays(sorted[sorted.length - 1], pad) };
}

/** Posisi x (px) tanggal relatif awal rentang. */
export function xOf(date: string, rangeStart: string, dayWidth: number): number {
  return diffDays(rangeStart, date) * dayWidth;
}

export type DragMode = "move" | "start" | "end";

/** Geser bar `days` hari. move = geser keduanya; start/end = ubah durasi (minimal 1 hari). */
export function shiftSpan(span: Span, days: number, mode: DragMode): Span {
  if (mode === "move") return { start: addDays(span.start, days), end: addDays(span.end, days) };
  if (mode === "start") {
    const start = addDays(span.start, days);
    return { start: start > span.end ? span.end : start, end: span.end };
  }
  const end = addDays(span.end, days);
  return { start: span.start, end: end < span.start ? span.start : end };
}

/** Label tick header sesuai zoom: hari (tiap tanggal), minggu (tiap Senin), bulan (tiap tanggal 1). */
export function ticks(range: Span, zoom: GanttZoom): string[] {
  const out: string[] = [];
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) {
    const day = Number(d.slice(8, 10));
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (zoom === "day" || (zoom === "week" && dow === 1) || (zoom === "month" && day === 1)) out.push(d);
  }
  return out;
}
