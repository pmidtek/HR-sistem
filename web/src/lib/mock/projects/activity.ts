/** Activity log dummy, dibangkitkan dari data project supaya konsisten. Urut terbaru dulu. */
import { refLabel, taskRef } from "../../calc/project";
import type { ActivityKind, ActivityLog } from "../../project-types";
import { boardColumns, projects, sprints } from "./base";
import { tasks } from "./tasks";
import { changeRequests, deliverables, milestones, moms } from "./workspace";

const out: ActivityLog[] = [];
let n = 0;
function log(projectId: string, actorId: string, at: string, kind: ActivityKind, text: string, targetRef: string | null) {
  n += 1;
  out.push({ id: `act${n}`, projectId, actorId, at, kind, text, targetRef });
}

const colName = (id: string) => boardColumns.find((c) => c.id === id)?.name ?? "";
const doneOf = (boardId: string) => boardColumns.find((c) => c.boardId === boardId && c.isDone)?.name ?? "Done";

for (const t of tasks) {
  log(t.projectId, t.createdBy, t.createdAt, "task_created", `Task dibuat: ${t.title}`, taskRef(t));
  const actor = t.assigneeIds[0] ?? t.createdBy;
  if (t.completedAt) {
    log(t.projectId, actor, t.completedAt, "task_done", `Task dipindahkan ke ${doneOf(t.boardId)}`, taskRef(t));
  } else if (t.startDate && t.startDate <= "2026-10-07") {
    log(t.projectId, actor, `${t.startDate}T09:30:00.000+07:00`, "task_moved", `Task dipindahkan ke ${colName(t.columnId)}`, taskRef(t));
  }
  for (const c of t.comments) log(t.projectId, c.authorId, c.createdAt, "comment", "Komentar baru", taskRef(t));
  t.checklist.filter((c) => c.done).forEach((c, i) =>
    log(t.projectId, actor, `${t.startDate ?? "2026-10-01"}T1${i + 1}:00:00.000+07:00`, "subtask", `Subtask "${c.text}" diselesaikan`, taskRef(t)),
  );
}

for (const m of milestones.filter((x) => x.completedAt)) {
  const p = projects.find((x) => x.id === m.projectId);
  log(m.projectId, p?.leadId ?? "u1", m.completedAt ?? "", "milestone_done", `Milestone tercapai: ${m.name}`, null);
}
for (const m of moms.filter((x) => x.status === "published")) log(m.projectId, m.authorId, m.updatedAt, "mom_published", `MOM dipublikasikan: ${m.title}`, null);
for (const d of deliverables.filter((x) => x.status === "sent" && x.deadline)) {
  log(d.projectId, d.ownerId, `${d.deadline}T15:00:00.000+07:00`, "deliverable_status", `Deliverable "${d.title}" terkirim`, null);
}
for (const c of changeRequests) {
  log(c.projectId, "u4", `${c.requestedAt}T11:00:00.000+07:00`, "cr", `CR diajukan: ${c.title}`, refLabel("CR", c.number));
  if (c.decidedAt && c.decidedById) log(c.projectId, c.decidedById, `${c.decidedAt}T14:00:00.000+07:00`, "cr_status", "CR disetujui", refLabel("CR", c.number));
}
for (const s of sprints) {
  const p = projects.find((x) => x.id === s.projectId);
  if (s.status !== "planned") log(s.projectId, p?.leadId ?? "u1", `${s.startDate}T09:00:00.000+07:00`, "sprint_started", `${s.name} dimulai`, null);
  if (s.completedAt) log(s.projectId, p?.leadId ?? "u1", s.completedAt, "sprint_completed", `${s.name} selesai`, null);
}
for (const p of projects) {
  for (const m of p.members.filter((x) => x.role !== "lead")) {
    log(p.id, p.leadId, `${m.joinedAt}T08:30:00.000+07:00`, "member_added", "Anggota ditambahkan", null);
  }
}

/** Urut terbaru dulu. Aktivitas setelah "hari ini" dummy (7 Okt 2026) dibuang. */
export const activityLogs: ActivityLog[] = out
  .filter((a) => a.at.slice(0, 10) <= "2026-10-07")
  .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
