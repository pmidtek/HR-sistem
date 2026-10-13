import { describe, expect, it } from "vitest";
import type { Baseline, ChangeRequest, Sprint } from "../project-types";
import type { BoardColumn, Task } from "../types";
import {
  agenda,
  canTransitionCr,
  crSummary,
  attentionTasks,
  createsCycle,
  doneColumnIds,
  emptyFilters,
  filterTasks,
  isDeliverableLate,
  isOverdue,
  milestoneState,
  nextNumber,
  progressOf,
  refLabel,
  workload,
} from "./project";
import { buildBaselinePoints, burndown, isScopeCreep, plannedAt, sCurve, sprintReport, velocity } from "./project-charts";

const TODAY = "2026-10-07";

const columns: BoardColumn[] = [
  { id: "todo", projectId: "p", boardId: "b", name: "To Do", order: 0, isDone: false, color: null },
  { id: "doing", projectId: "p", boardId: "b", name: "In Progress", order: 1, isDone: false, color: null },
  { id: "done", projectId: "p", boardId: "b", name: "Done", order: 2, isDone: true, color: null },
];
const doneCols = doneColumnIds(columns);

let seq = 0;
function task(p: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `t${seq}`, projectId: "p", boardId: "b", columnId: "todo", number: seq, order: seq, title: `Task ${seq}`, description: "",
    assigneeIds: [], priority: "medium", labels: [], storyId: null, sprintId: null, startDate: null, deadline: null,
    estimateHours: null, dependsOn: [], blocked: false, blockedReason: null, checklist: [], comments: [], attachments: [],
    createdBy: "u1", createdAt: "2026-09-01T09:00:00.000Z", completedAt: null, ...p,
  };
}

describe("progress & keterlambatan", () => {
  it("progress = task di kolom selesai / total", () => {
    const tasks = [task({ columnId: "done" }), task(), task(), task({ columnId: "done" })];
    expect(progressOf(tasks, doneCols)).toEqual({ done: 2, total: 4, percent: 50 });
    expect(progressOf([], doneCols).percent).toBe(0);
  });

  it("terlambat = belum selesai dan deadline < hari ini", () => {
    expect(isOverdue(task({ deadline: "2026-10-06" }), doneCols, TODAY)).toBe(true);
    expect(isOverdue(task({ deadline: TODAY }), doneCols, TODAY)).toBe(false);
    expect(isOverdue(task({ deadline: "2026-10-01", columnId: "done" }), doneCols, TODAY)).toBe(false);
    expect(isOverdue(task({ deadline: null }), doneCols, TODAY)).toBe(false);
  });

  it("perlu perhatian: blocked+terlambat dulu, lalu paling lama terlambat", () => {
    const a = task({ deadline: "2026-10-05" });
    const b = task({ deadline: "2026-09-20" });
    const c = task({ blocked: true });
    const d = task({ blocked: true, deadline: "2026-10-06" });
    const e = task({ deadline: "2026-10-20" });
    expect(attentionTasks([a, b, c, d, e], doneCols, TODAY).map((t) => t.id)).toEqual([d.id, c.id, b.id, a.id]);
  });
});

describe("agenda 14 hari", () => {
  it("hanya hari ini s/d +13, dikelompokkan dan diurutkan per tanggal", () => {
    const groups = agenda(
      [
        { date: "2026-10-21", kind: "task", label: "lewat batas", ref: null },
        { date: "2026-10-09", kind: "milestone", label: "M1", ref: null },
        { date: TODAY, kind: "task", label: "A", ref: "#1" },
        { date: "2026-10-09", kind: "deliverable", label: "D1", ref: null },
        { date: "2026-10-06", kind: "sprint", label: "kemarin", ref: null },
        { date: "2026-10-20", kind: "sprint", label: "hari ke-13", ref: null },
      ],
      TODAY,
    );
    expect(groups.map((g) => [g.date, g.items.length])).toEqual([[TODAY, 1], ["2026-10-09", 2], ["2026-10-20", 1]]);
  });
});

describe("beban tim", () => {
  it("terbuka, berjalan, terlambat per orang + baris tanpa assignee", () => {
    const tasks = [
      task({ assigneeIds: ["u1"] }),
      task({ assigneeIds: ["u1", "u2"], columnId: "doing", deadline: "2026-10-01" }),
      task({ assigneeIds: ["u1"], columnId: "done" }),
      task({}),
    ];
    expect(workload(tasks, columns, ["u1", "u2"], TODAY)).toEqual([
      { userId: "u1", open: 2, inProgress: 1, overdue: 1 },
      { userId: "u2", open: 1, inProgress: 1, overdue: 1 },
      { userId: null, open: 1, inProgress: 0, overdue: 0 },
    ]);
  });
});

describe("dependensi melingkar", () => {
  const tasks = [
    { id: "a", dependsOn: [] },
    { id: "b", dependsOn: ["a"] },
    { id: "c", dependsOn: ["b"] },
  ];
  it("a bergantung pada c (c→b→a) = melingkar", () => {
    expect(createsCycle(tasks, "a", ["c"])).toBe(true);
  });
  it("bergantung pada diri sendiri = melingkar", () => {
    expect(createsCycle(tasks, "a", ["a"])).toBe(true);
  });
  it("c bergantung pada a = aman", () => {
    expect(createsCycle(tasks, "c", ["a", "b"])).toBe(false);
  });
});

describe("penomoran CR/DR", () => {
  it("nomor berikut = terbesar + 1, format 3 digit", () => {
    expect(nextNumber([])).toBe(1);
    expect(nextNumber([1, 2, 5])).toBe(6);
    expect(refLabel("CR", 7)).toBe("CR-007");
    expect(refLabel("DR", 12)).toBe("DR-012");
  });
});

const sprint = (p: Partial<Sprint>): Sprint => ({
  id: "s1", projectId: "p", teamId: null, name: "Sprint 1", goal: "", startDate: "2026-10-01", endDate: "2026-10-05",
  status: "active", plannedTaskIds: [], completedAt: null, ...p,
});

describe("burndown & velocity", () => {
  const t1 = task({ completedAt: "2026-10-02T10:00:00.000Z" });
  const t2 = task({ completedAt: "2026-10-04T10:00:00.000Z" });
  const t3 = task({});
  const t4 = task({ completedAt: "2026-10-03T10:00:00.000Z" });

  it("ideal turun linier, aktual = sisa task, tanpa aktual setelah hari ini", () => {
    const pts = burndown(sprint({ plannedTaskIds: [t1.id, t2.id, t3.id, t4.id] }), [t1, t2, t3, t4], "2026-10-03");
    expect(pts.map((p) => p.ideal)).toEqual([4, 3, 2, 1, 0]);
    expect(pts.map((p) => p.actual)).toEqual([4, 3, 2, null, null]);
  });

  it("velocity hanya sprint selesai: planned vs selesai sebelum akhir sprint", () => {
    const done = sprint({ id: "s0", name: "S0", status: "completed", endDate: "2026-10-03", plannedTaskIds: [t1.id, t2.id, t3.id] });
    const active = sprint({ id: "s1", status: "active", plannedTaskIds: [t4.id] });
    expect(velocity([active, done], [t1, t2, t3, t4])).toEqual([{ sprintId: "s0", name: "S0", planned: 3, completed: 1 }]);
  });

  it("sprint report: carried over & task tambahan", () => {
    const extra = task({ sprintId: "s1" });
    const r = sprintReport(sprint({ plannedTaskIds: [t1.id, t2.id, t3.id] }), [t1, t2, t3, extra]);
    expect(r).toEqual({ planned: 3, completed: 2, carriedOver: 1, added: 1 });
  });
});

describe("S-curve", () => {
  const tasks = [
    task({ deadline: "2026-09-08", completedAt: "2026-09-07T10:00:00.000Z" }),
    task({ deadline: "2026-09-15", completedAt: "2026-09-20T10:00:00.000Z" }),
    task({ deadline: "2026-09-22" }),
    task({ deadline: "2026-09-29" }),
  ];
  const baseline: Baseline = {
    id: "bl", projectId: "p", name: "Awal", createdAt: "2026-09-01", taskCount: 4,
    plannedPoints: buildBaselinePoints(tasks, "2026-09-01", "2026-09-29"),
  };

  it("baseline kumulatif per minggu dari deadline", () => {
    expect(baseline.plannedPoints.map((p) => p.percent)).toEqual([0, 25, 50, 75, 100]);
    expect(plannedAt(baseline.plannedPoints, "2026-09-04")).toBeCloseTo(10.71, 1);
  });

  it("actual sampai hari ini; revised lebih lambat jika ada CR disetujui", () => {
    const cr: ChangeRequest = {
      id: "c", projectId: "p", number: 1, title: "", description: "", source: "client", requestedBy: "", requestedAt: "2026-09-10",
      impactDays: 14, impactNote: "", estimateHours: null, status: "approved", decidedById: null, decidedAt: null, linkedTaskIds: [],
    };
    const pts = sCurve(baseline, tasks, [cr], "2026-09-22");
    expect(pts.map((p) => p.actual)).toEqual([0, 25, 25, 50, null, null, null]);
    expect(pts[4].planned).toBe(100);
    expect(pts[4].revised).toBeLessThan(100);
    expect(pts[pts.length - 1].revised).toBe(100);
  });

  it("scope creep jika task bertambah > 10%", () => {
    expect(isScopeCreep(30, 33)).toBe(false);
    expect(isScopeCreep(30, 34)).toBe(true);
  });
});

describe("filter board", () => {
  const a = task({ title: "Halaman login", assigneeIds: ["u1"], priority: "high", labels: ["l1"], storyId: "s1" });
  const b = task({ title: "API invoice", assigneeIds: ["u2"], priority: "low", storyId: "s2" });
  const c = task({ title: "Tanpa orang" });
  const storyEpic = new Map([["s1", "e1"], ["s2", "e2"]]);
  const run = (f: Partial<typeof emptyFilters>) => filterTasks([a, b, c], { ...emptyFilters, ...f }, "u1", storyEpic).map((t) => t.id);

  it("hanya task saya, assignee, tanpa assignee", () => {
    expect(run({ onlyMine: true })).toEqual([a.id]);
    expect(run({ assigneeId: "u2" })).toEqual([b.id]);
    expect(run({ assigneeId: "none" })).toEqual([c.id]);
  });

  it("prioritas, label, epic, pencarian judul & nomor", () => {
    expect(run({ priority: "low" })).toEqual([b.id]);
    expect(run({ labelId: "l1" })).toEqual([a.id]);
    expect(run({ epicId: "e2" })).toEqual([b.id]);
    expect(run({ query: "LOGIN" })).toEqual([a.id]);
    expect(run({ query: `#${b.number}` })).toEqual([b.id]);
  });
});

describe("status milestone & deliverable", () => {
  it("selesai / terlambat / belum", () => {
    expect(milestoneState({ targetDate: "2026-10-01", completedAt: "2026-10-02T10:00:00Z" }, TODAY)).toBe("done");
    expect(milestoneState({ targetDate: "2026-10-01", completedAt: null }, TODAY)).toBe("late");
    expect(milestoneState({ targetDate: TODAY, completedAt: null }, TODAY)).toBe("open");
  });
  it("deliverable terlambat hanya jika belum terkirim", () => {
    expect(isDeliverableLate({ deadline: "2026-10-01", status: "review" }, TODAY)).toBe(true);
    expect(isDeliverableLate({ deadline: "2026-10-01", status: "sent" }, TODAY)).toBe(false);
    expect(isDeliverableLate({ deadline: null, status: "draft" }, TODAY)).toBe(false);
  });
});

describe("alur & ringkasan change request", () => {
  it("transisi yang diizinkan", () => {
    expect(canTransitionCr("submitted", "under_review")).toBe(true);
    expect(canTransitionCr("under_review", "approved")).toBe(true);
    expect(canTransitionCr("approved", "implemented")).toBe(true);
    expect(canTransitionCr("rejected", "approved")).toBe(false);
    expect(canTransitionCr("submitted", "implemented")).toBe(false);
  });
  it("ringkasan hanya menghitung CR disetujui/diimplementasikan untuk tambahan hari", () => {
    expect(crSummary([{ status: "approved", impactDays: 3 }, { status: "implemented", impactDays: 5 }, { status: "under_review", impactDays: 15 }]))
      .toEqual({ total: 3, approved: 2, extraDays: 8 });
  });
});
