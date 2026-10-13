import { describe, expect, it } from "vitest";
import { addColumn, deleteColumn } from "./actions-boards";
import { addComment, createTask, moveTask, updateTask } from "./actions-tasks";
import { initialState } from "./state";

const AT = "2026-10-07T10:00:00+07:00";
const lead = { id: "u4", role: "employee" as const }; // lead p3
const viewer = { id: "u5", role: "employee" as const }; // viewer p3
const outsider = { id: "u9", role: "employee" as const };
const stakeholder = { id: "u1", role: "stakeholder" as const };
const base = { projectId: "p3", boardId: "p3-b1", columnId: "p3-b1-c1", title: "Task uji" };

describe("aksi task", () => {
  it("member membuat task: nomor berikutnya + activity tercatat", () => {
    const s = createTask(initialState, base, lead, AT);
    const t = s.tasks[s.tasks.length - 1];
    expect(t.number).toBe(31);
    expect(s.activityLogs[0]).toMatchObject({ projectId: "p3", kind: "task_created", targetRef: "#31" });
  });

  it("viewer dan non-anggota tidak bisa membuat task", () => {
    expect(() => createTask(initialState, base, viewer, AT)).toThrow();
    expect(() => createTask(initialState, base, outsider, AT)).toThrow();
    expect(() => createTask(initialState, base, stakeholder, AT)).not.toThrow();
  });

  it("pindah ke kolom selesai mengisi completedAt, keluar lagi mengosongkan", () => {
    const done = moveTask(initialState, "p3-t6", "p3-b1-c4", null, lead, AT);
    expect(done.tasks.find((t) => t.id === "p3-t6")?.completedAt).toBe(AT);
    expect(done.activityLogs[0]).toMatchObject({ kind: "task_done", text: "Task dipindahkan ke Done" });
    const back = moveTask(done, "p3-t6", "p3-b1-c2", null, lead, AT);
    expect(back.tasks.find((t) => t.id === "p3-t6")?.completedAt).toBeNull();
  });

  it("urutan dalam kolom: sisipkan sebelum task lain", () => {
    const s = moveTask(initialState, "p3-t8", "p3-b1-c4", "p3-t1", lead, AT);
    const col = s.tasks.filter((t) => t.columnId === "p3-b1-c4").sort((a, b) => a.order - b.order).map((t) => t.id);
    expect(col.indexOf("p3-t8")).toBe(col.indexOf("p3-t1") - 1);
  });

  it("dependensi melingkar ditolak", () => {
    // t5 bergantung pada t4 → t4 tidak boleh bergantung pada t5.
    expect(() => updateTask(initialState, "p3-t4", { dependsOn: ["p3-t5"] }, lead, AT)).toThrow(/melingkar/);
  });

  it("blocked wajib alasan", () => {
    expect(() => updateTask(initialState, "p3-t8", { blocked: true }, lead, AT)).toThrow(/Alasan/);
  });

  it("komentar dengan @mention mengirim notifikasi", () => {
    const s = addComment(initialState, "p3-t6", "Tolong cek @Rizky", lead, AT);
    expect(s.notifications[0]).toMatchObject({ userId: "u8", title: "Anda disebut di komentar" });
  });
});

describe("aksi kolom", () => {
  it("hanya lead/stakeholder yang kelola kolom", () => {
    expect(() => addColumn(initialState, "p3-b1", "Blocked", { id: "u8", role: "employee" }, AT)).toThrow();
    expect(addColumn(initialState, "p3-b1", "Blocked", lead, AT).boardColumns.some((c) => c.name === "Blocked")).toBe(true);
  });

  it("hapus kolom berisi task wajib pilih tujuan", () => {
    expect(() => deleteColumn(initialState, "p3-b1-c2", null, lead, AT)).toThrow(/tujuan/);
    const s = deleteColumn(initialState, "p3-b1-c2", "p3-b1-c1", lead, AT);
    expect(s.tasks.find((t) => t.id === "p3-t6")?.columnId).toBe("p3-b1-c1");
  });
});
