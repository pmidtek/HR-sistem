import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "brand" | "success" | "danger" | "warning";

const badgeTones: Record<BadgeTone, { soft: string; dot: string }> = {
  neutral: { soft: "bg-hover text-fg-muted shadow-[inset_0_0_0_1px_var(--border-default)]", dot: "bg-fg-subtle" },
  brand: { soft: "bg-brand-subtle text-fg-brand", dot: "bg-brand" },
  success: { soft: "bg-success-subtle text-fg-success", dot: "bg-success" },
  danger: { soft: "bg-danger-subtle text-fg-danger", dot: "bg-danger" },
  warning: { soft: "bg-warning-subtle text-warning", dot: "bg-warning" },
};

type BadgeProps = { tone?: BadgeTone; dot?: boolean; children: ReactNode; className?: string };

export function Badge({ tone = "neutral", dot, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-xxs px-2 text-xs font-medium whitespace-nowrap",
        badgeTones[tone].soft,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", badgeTones[tone].dot)} />}
      {children}
    </span>
  );
}

/** Status/eyebrow: Geist Mono ALL CAPS + dot berwarna. */
export function Eyebrow({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-fg-muted uppercase">
      <span className={cn("size-1.5 rounded-full", badgeTones[tone].dot)} />
      {children}
    </span>
  );
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "neutral" | "raised" | "brand";
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const pad = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };

export function Card({ tone = "raised", interactive, padding = "md", className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-m shadow-[inset_0_0_0_1px_var(--border-default)]",
        tone === "raised" && "bg-raised",
        tone === "neutral" && "bg-canvas",
        tone === "brand" && "bg-brand-subtle shadow-[inset_0_0_0_1px_var(--brand)]",
        interactive &&
          "cursor-pointer transition-[transform,box-shadow] duration-[200ms] ease-standard hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-sm)]",
        pad[padding],
        className,
      )}
      {...rest}
    />
  );
}

type AvatarProps = { name: string; size?: "small" | "medium" | "large"; color?: "neutral" | "brand" };

export function Avatar({ name, size = "medium", color = "neutral" }: AvatarProps) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-medium",
        size === "small" && "size-6 text-[10px]",
        size === "medium" && "size-8 text-xs",
        size === "large" && "size-11 text-sm",
        color === "brand" ? "bg-brand text-fg-on-brand" : "bg-overlay text-fg-muted shadow-[inset_0_0_0_1px_var(--border-strong)]",
      )}
    >
      {initials}
    </span>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Memuat"
      style={{ width: size, height: size }}
      className="inline-block animate-spin rounded-full border-2 border-line-strong border-t-brand"
    />
  );
}

/** Angka besar sebagai display element (Instrument Serif). */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className="font-serif text-4xl leading-none text-fg">{value}</span>
      {sub && <span className="text-xs text-fg-subtle">{sub}</span>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-s border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-sm font-medium text-fg">{title}</p>
      {description && <p className="max-w-sm text-xs text-fg-muted">{description}</p>}
    </div>
  );
}
