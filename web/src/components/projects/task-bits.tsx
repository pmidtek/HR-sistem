import type { ProjectLabel } from "@/lib/project-types";
import type { TaskPriority } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Avatar, Badge, type BadgeTone } from "../ui/display";

export const priorityLabel: Record<TaskPriority, string> = { low: "Rendah", medium: "Sedang", high: "Tinggi", urgent: "Urgent" };
const priorityTone: Record<TaskPriority, BadgeTone> = { low: "neutral", medium: "neutral", high: "warning", urgent: "danger" };
export const priorityRank: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge tone={priorityTone[priority]}>{priorityLabel[priority]}</Badge>;
}

export function LabelChip({ label }: { label: ProjectLabel }) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-xxs bg-hover px-1.5 text-[11px] text-fg-muted">
      <span className="size-1.5 rounded-full" style={{ background: label.color }} />
      {label.name}
    </span>
  );
}

/** Avatar bertumpuk, maks `max` lalu "+n". */
export function AvatarStack({ names, max = 3, size = "small" }: { names: string[]; max?: number; size?: "small" | "medium" }) {
  if (names.length === 0) return null;
  const extra = names.length - max;
  return (
    <span className="flex -space-x-1.5" title={names.join(", ")}>
      {names.slice(0, max).map((n) => (
        <Avatar key={n} name={n} size={size} />
      ))}
      {extra > 0 && (
        <span className={cn("inline-flex items-center justify-center rounded-full bg-overlay font-mono text-[10px] text-fg-muted shadow-[inset_0_0_0_1px_var(--border-strong)]", size === "small" ? "size-6" : "size-8")}>
          +{extra}
        </span>
      )}
    </span>
  );
}
