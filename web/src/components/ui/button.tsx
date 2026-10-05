import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Role = "brand" | "neutral" | "danger";
type Size = "small" | "medium";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role"> & {
  variant?: Variant;
  tone?: Role;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
};

const styles: Record<Variant, Record<Role, string>> = {
  primary: {
    brand: "bg-brand text-fg-on-brand hover:bg-brand-hover active:bg-brand-press",
    neutral: "bg-fg text-canvas hover:opacity-90",
    danger: "bg-danger text-fg-on-brand hover:opacity-90",
  },
  secondary: {
    brand: "text-fg-brand shadow-[inset_0_0_0_1px_var(--brand)] hover:bg-brand-subtle",
    neutral: "text-fg shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-hover",
    danger: "text-fg-danger shadow-[inset_0_0_0_1px_var(--danger)] hover:bg-danger-subtle",
  },
  ghost: {
    brand: "text-fg-brand hover:bg-brand-subtle",
    neutral: "text-fg-muted hover:bg-hover hover:text-fg",
    danger: "text-fg-danger hover:bg-danger-subtle",
  },
};

export function buttonClass({
  variant = "primary",
  tone = "brand",
  size = "medium",
  fullWidth,
}: Pick<ButtonProps, "variant" | "tone" | "size" | "fullWidth">): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xxs font-medium whitespace-nowrap",
    "transition-colors duration-[120ms] ease-standard select-none",
    "disabled:pointer-events-none disabled:opacity-40",
    size === "small" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
    fullWidth && "w-full",
    styles[variant][tone],
  );
}

export function Button({
  variant,
  tone,
  size,
  iconLeft,
  iconRight,
  fullWidth,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cn(buttonClass({ variant, tone, size, fullWidth }), className)} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}

type IconButtonProps = Omit<ButtonProps, "iconLeft" | "iconRight" | "fullWidth"> & {
  label: string;
  active?: boolean;
};

export function IconButton({
  label,
  active,
  variant = "ghost",
  tone = "neutral",
  size = "medium",
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        buttonClass({ variant, tone, size }),
        size === "small" ? "w-8 px-0" : "w-10 px-0",
        active && "bg-brand-subtle text-fg-brand",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
