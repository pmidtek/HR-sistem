import { describe, expect, it } from "vitest";
import { ganttRange, shiftSpan, taskSpan, ticks, xOf } from "./gantt";

describe("gantt", () => {
  it("rentang bar: satu tanggal jadi satu hari, tanpa tanggal = null, terbalik dirapikan", () => {
    expect(taskSpan({ startDate: "2026-10-05", deadline: "2026-10-09" })).toEqual({ start: "2026-10-05", end: "2026-10-09" });
    expect(taskSpan({ startDate: null, deadline: "2026-10-09" })).toEqual({ start: "2026-10-09", end: "2026-10-09" });
    expect(taskSpan({ startDate: "2026-10-09", deadline: "2026-10-05" })).toEqual({ start: "2026-10-05", end: "2026-10-09" });
    expect(taskSpan({ startDate: null, deadline: null })).toBeNull();
  });

  it("rentang tampilan dengan jeda & posisi x", () => {
    const r = ganttRange(["2026-10-10", "2026-10-01"], 2);
    expect(r).toEqual({ start: "2026-09-29", end: "2026-10-12" });
    expect(xOf("2026-10-01", r.start, 10)).toBe(20);
  });

  it("drag: geser, ubah awal/akhir, minimal satu hari", () => {
    const s = { start: "2026-10-05", end: "2026-10-09" };
    expect(shiftSpan(s, 3, "move")).toEqual({ start: "2026-10-08", end: "2026-10-12" });
    expect(shiftSpan(s, -2, "start")).toEqual({ start: "2026-10-03", end: "2026-10-09" });
    expect(shiftSpan(s, 10, "start")).toEqual({ start: "2026-10-09", end: "2026-10-09" });
    expect(shiftSpan(s, -10, "end")).toEqual({ start: "2026-10-05", end: "2026-10-05" });
  });

  it("tick header per zoom", () => {
    const r = { start: "2026-09-28", end: "2026-10-12" };
    expect(ticks(r, "day")).toHaveLength(15);
    expect(ticks(r, "week")).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(ticks(r, "month")).toEqual(["2026-10-01"]);
  });
});
