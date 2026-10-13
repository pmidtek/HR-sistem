import { describe, expect, it } from "vitest";
import type { TimesheetEntry } from "../types";
import { countBy, hoursPerPerson, hoursPerWeek } from "./project-analytics";

const e = (userId: string, date: string, start: string, end: string): TimesheetEntry =>
  ({ id: `${userId}${date}${start}`, userId, date, projectCode: "PR1", activityId: "dev", start, end, description: "", locked: false });

describe("analytics project", () => {
  it("countBy menghitung multi-kunci", () => {
    const m = countBy([{ a: ["u1", "u2"] }, { a: ["u1"] }, { a: [] }], (x) => (x.a.length ? x.a : ["none"]));
    expect(Object.fromEntries(m)).toEqual({ u1: 2, u2: 1, none: 1 });
  });

  it("jam per minggu (Senin) dan per orang", () => {
    const list = [e("u1", "2026-10-05", "09:00", "12:00"), e("u1", "2026-10-07", "09:00", "10:30"), e("u2", "2026-10-12", "13:00", "17:00")];
    expect(hoursPerWeek(list)).toEqual([{ week: "2026-10-05", hours: 4.5 }, { week: "2026-10-12", hours: 4 }]);
    expect(hoursPerPerson(list)).toEqual([{ userId: "u1", hours: 4.5 }, { userId: "u2", hours: 4 }]);
  });
});
