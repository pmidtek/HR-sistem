/** Aksi Analytics: simpan baseline rencana (lead/stakeholder). */
import type { Actor } from "@/lib/calc/approval";
import { buildBaselinePoints } from "@/lib/calc/project-charts";
import type { Baseline } from "@/lib/project-types";
import { ActionError } from "./actions";
import { assertManage, withActivity } from "./project-core";
import { newId, type DataState } from "./state";

/** Snapshot rencana saat ini dari deadline task (task tanpa deadline dianggap selesai di target). */
export function saveBaseline(s: DataState, projectId: string, name: string, actor: Actor, at: string, id: string = newId("bl")): DataState {
  const p = assertManage(s, projectId, actor);
  if (!name.trim()) throw new ActionError("Nama baseline wajib diisi.");
  const tasks = s.tasks.filter((t) => t.projectId === projectId);
  if (tasks.length === 0) throw new ActionError("Belum ada task untuk dijadikan baseline.");
  const baseline: Baseline = { id, projectId, name: name.trim(), createdAt: at, taskCount: tasks.length, plannedPoints: buildBaselinePoints(tasks, p.startDate, p.targetDate) };
  return withActivity({ ...s, baselines: [...s.baselines, baseline] }, projectId, actor.id, at, "settings", `Baseline disimpan: ${baseline.name} (${tasks.length} task)`);
}
