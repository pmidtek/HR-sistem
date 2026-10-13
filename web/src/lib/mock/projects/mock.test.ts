import { describe, expect, it } from "vitest";
import { createsCycle } from "../../calc/project";
import { isScopeCreep } from "../../calc/project-charts";
import { activityLogs } from "./activity";
import { boardColumns, boards, epics, projects, sprints, stories } from "./base";
import { tasks } from "./tasks";
import { baselines, changeRequests, decisions, deliverables, milestones, moms, notes, projectLinks, touchpoints } from "./workspace";

const ids = new Set(tasks.map((t) => t.id));
const count = <T extends { projectId: string }>(list: T[], projectId: string) => list.filter((x) => x.projectId === projectId).length;

describe("integritas data dummy project", () => {
  it("setiap task ada di kolom milik board-nya, dan selesai ⇔ kolom selesai", () => {
    for (const t of tasks) {
      const col = boardColumns.find((c) => c.id === t.columnId);
      expect(col?.boardId, t.id).toBe(t.boardId);
      expect(Boolean(t.completedAt), t.id).toBe(Boolean(col?.isDone));
    }
  });

  it("dependensi menunjuk task yang ada dan tidak melingkar", () => {
    for (const t of tasks) {
      for (const d of t.dependsOn) expect(ids.has(d), `${t.id} → ${d}`).toBe(true);
      expect(createsCycle(tasks, t.id, t.dependsOn), t.id).toBe(false);
    }
  });

  it("referensi sprint, milestone, story valid", () => {
    for (const s of sprints) for (const id of s.plannedTaskIds) expect(ids.has(id), `${s.id} → ${id}`).toBe(true);
    for (const m of milestones) for (const id of m.taskIds) expect(ids.has(id), `${m.id} → ${id}`).toBe(true);
    const storyIds = new Set(stories.map((s) => s.id));
    for (const t of tasks.filter((x) => x.storyId)) expect(storyIds.has(t.storyId ?? ""), t.id).toBe(true);
    for (const s of stories) expect(epics.some((e) => e.id === s.epicId), s.id).toBe(true);
  });

  it("nomor task unik per project & leadId sinkron dengan members", () => {
    for (const p of projects) {
      const nums = tasks.filter((t) => t.projectId === p.id).map((t) => t.number);
      expect(new Set(nums).size).toBe(nums.length);
      expect(p.members.find((m) => m.role === "lead")?.userId).toBe(p.leadId);
      expect(p.memberIds).toEqual(p.members.map((m) => m.userId));
    }
  });

  it("jumlah data p3 sesuai spec", () => {
    expect(count(boards, "p3")).toBe(3);
    expect(count(tasks, "p3")).toBe(30);
    expect(sprints.filter((s) => s.projectId === "p3" && s.status === "completed")).toHaveLength(2);
    expect(sprints.filter((s) => s.projectId === "p3" && s.status === "active")).toHaveLength(1);
    expect(count(milestones, "p3")).toBe(4);
    expect(count(deliverables, "p3")).toBe(6);
    expect(count(moms, "p3")).toBe(3);
    expect(count(notes, "p3")).toBe(5);
    expect(count(decisions, "p3")).toBe(4);
    expect(count(projectLinks, "p3")).toBe(5);
    expect(count(touchpoints, "p3")).toBe(6);
    expect(count(changeRequests, "p3")).toBe(3);
    expect(count(baselines, "p3")).toBe(1);
    expect(count(activityLogs, "p3")).toBeGreaterThanOrEqual(40);
  });

  it("baseline p3 dibuat sebelum task tambahan → scope creep terdeteksi", () => {
    const bl = baselines.find((b) => b.projectId === "p3");
    expect(bl?.taskCount).toBe(26);
    expect(isScopeCreep(bl?.taskCount ?? 0, count(tasks, "p3"))).toBe(true);
  });

  it("activity urut terbaru dulu", () => {
    const times = activityLogs.map((a) => Date.parse(a.at));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});
