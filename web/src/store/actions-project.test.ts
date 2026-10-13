import { describe, expect, it } from "vitest";
import { addColumn, deleteColumn } from "./actions-boards";
import { saveDeliverable, saveMilestone, setDeliverableStatus, toggleMilestoneDone } from "./actions-plan";
import { completeSprint, deleteSprint, setSprintTasks, startSprint } from "./actions-sprints";
import { actionItemToTask, publishMom, saveMom } from "./actions-mom";
import { saveDecision, saveLink } from "./actions-files";
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

describe("aksi milestone & deliverable", () => {
  it("member biasa tidak bisa kelola milestone", () => {
    const input = { name: "M baru", description: "", targetDate: "2026-11-01", taskIds: [] };
    expect(() => saveMilestone(initialState, "p3", input, { id: "u8", role: "employee" }, AT)).toThrow();
    expect(saveMilestone(initialState, "p3", input, lead, AT).milestones.some((m) => m.name === "M baru")).toBe(true);
  });

  it("tandai milestone selesai tercatat sebagai milestone_done", () => {
    const s = toggleMilestoneDone(initialState, "p3-m3", lead, AT);
    expect(s.milestones.find((m) => m.id === "p3-m3")?.completedAt).toBe(AT);
    expect(s.activityLogs[0]).toMatchObject({ kind: "milestone_done" });
  });

  it("ubah status deliverable masuk activity; link wajib http(s)", () => {
    const s = setDeliverableStatus(initialState, "p3-d4", "review", lead, AT);
    expect(s.activityLogs[0]).toMatchObject({ kind: "deliverable_status", text: 'Deliverable "Dokumentasi API publik" → Review' });
    const d = initialState.deliverables.find((x) => x.id === "p3-d4");
    expect(() => d && saveDeliverable(initialState, "p3", { ...d, link: "drive.google.com/x" }, lead, AT)).toThrow(/http/);
  });
});

describe("aksi sprint", () => {
  it("hanya satu sprint aktif per tim", () => {
    expect(() => startSprint(initialState, "p3-s7", lead, AT)).toThrow(/aktif/);
  });

  it("selesaikan sprint: task belum selesai pindah ke sprint berikut", () => {
    const s = completeSprint(initialState, "p3-s6", "p3-s7", lead, AT);
    expect(s.sprints.find((x) => x.id === "p3-s6")?.status).toBe("completed");
    expect(s.tasks.find((t) => t.id === "p3-t6")?.sprintId).toBe("p3-s7");
    expect(s.tasks.find((t) => t.id === "p3-t8")?.sprintId).toBe("p3-s6"); // sudah selesai, tetap
    // Setelah itu Sprint 7 boleh dimulai dan snapshot berisi task pindahan.
    const started = startSprint(s, "p3-s7", lead, AT);
    expect(started.sprints.find((x) => x.id === "p3-s7")?.plannedTaskIds).toContain("p3-t6");
  });

  it("hanya sprint planned yang bisa dihapus; task kembali ke backlog", () => {
    expect(() => deleteSprint(initialState, "p3-s6", lead, AT)).toThrow();
    const withTask = setSprintTasks(initialState, "p3-s7", ["p3-t11"], lead, AT);
    const s = deleteSprint(withTask, "p3-s7", lead, AT);
    expect(s.tasks.find((t) => t.id === "p3-t11")?.sprintId).toBeNull();
  });
});

describe("aksi MOM & files", () => {
  it("MOM published hanya bisa diedit penulis/lead; publish memberi notifikasi peserta", () => {
    // p3-mom2 published, penulis u6 (Maya, member). Rizky (member, bukan penulis) ditolak.
    expect(() => saveMom(initialState, "p3-mom2", { title: "Ubah" }, { id: "u8", role: "employee" }, AT)).toThrow(/penulis/);
    expect(() => saveMom(initialState, "p3-mom2", { title: "Ubah" }, lead, AT)).not.toThrow();
    const s = publishMom(initialState, "p3-mom3", { id: "u6", role: "employee" }, AT);
    expect(s.moms.find((m) => m.id === "p3-mom3")?.status).toBe("published");
    expect(s.notifications[0]).toMatchObject({ userId: "u4", title: "MOM baru dipublikasikan" });
  });

  it("action item jadi task dan tertaut", () => {
    const s = actionItemToTask(initialState, "p3-mom3", "a1", "p3-b3", lead, AT, "task-baru");
    expect(s.tasks.find((t) => t.id === "task-baru")).toMatchObject({ title: "Konfirmasi jadwal UAT ke klien", columnId: "p3-b3-c0", assigneeIds: ["u6"] });
    expect(s.moms.find((m) => m.id === "p3-mom3")?.actionItems[0].taskId).toBe("task-baru");
    expect(() => actionItemToTask(s, "p3-mom3", "a1", "p3-b3", lead, AT)).toThrow(/sudah/);
  });

  it("keputusan baru dapat nomor DR berikut & menggantikan yang lama", () => {
    const s = saveDecision(initialState, "p3", {
      title: "Laporan selisih format CSV", context: "", decision: "", consequences: "", category: "Pelaporan", status: "accepted",
      decidedById: "u4", decidedAt: "2026-10-07", sourceMomId: null, supersedesId: "p3-dr4",
    }, lead, AT);
    const created = s.decisions.find((d) => d.title === "Laporan selisih format CSV");
    expect(created?.number).toBe(5);
    expect(s.decisions.find((d) => d.id === "p3-dr4")?.status).toBe("superseded");
    expect(s.activityLogs[0].targetRef).toBe("DR-005");
  });

  it("tautan wajib URL http(s)", () => {
    expect(() => saveLink(initialState, "p3", { label: "Doc", url: "docs.example.com", category: "Dokumen" }, lead, AT)).toThrow(/http/);
  });
});
