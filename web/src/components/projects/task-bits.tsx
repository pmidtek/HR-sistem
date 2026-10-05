import type { TaskPriority } from "@/lib/types";
import { Badge, type BadgeTone } from "../ui/display";

export const priorityLabel: Record<TaskPriority, string> = { low: "Rendah", medium: "Sedang", high: "Tinggi", urgent: "Urgent" };
const priorityTone: Record<TaskPriority, BadgeTone> = { low: "neutral", medium: "neutral", high: "warning", urgent: "danger" };

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge tone={priorityTone[priority]}>{priorityLabel[priority]}</Badge>;
}
