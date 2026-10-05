import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const controlBase = cn(
  "w-full rounded-xxs bg-sunken text-fg placeholder:text-fg-subtle",
  "shadow-[inset_0_0_0_1px_var(--border-default)] hover:shadow-[inset_0_0_0_1px_var(--border-strong)]",
  "focus:shadow-[inset_0_0_0_1px_var(--brand)] focus:outline-none",
  "transition-shadow duration-[120ms] disabled:opacity-50",
);

const errorRing = "shadow-[inset_0_0_0_1px_var(--danger)] hover:shadow-[inset_0_0_0_1px_var(--danger)]";

type FieldProps = {
  label?: string;
  helperText?: string;
  error?: string;
  id: string;
  children: ReactNode;
};

export function Field({ label, helperText, error, id, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-fg-muted">
          {label}
        </label>
      )}
      {children}
      {(error ?? helperText) && (
        <p className={cn("text-xs", error ? "text-fg-danger" : "text-fg-subtle")}>{error ?? helperText}</p>
      )}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  helperText?: string;
  error?: string;
  size?: "small" | "medium";
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

export function Input({ label, helperText, error, size = "medium", iconLeft, iconRight, className, id, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} helperText={helperText} error={error} id={inputId}>
      <div className="relative flex items-center">
        {iconLeft && <span className="pointer-events-none absolute left-3 text-fg-subtle">{iconLeft}</span>}
        <input
          id={inputId}
          className={cn(
            controlBase,
            size === "small" ? "h-8 px-2.5 text-xs" : "h-10 px-3 text-sm",
            iconLeft ? "pl-9" : undefined,
            iconRight ? "pr-9" : undefined,
            error && errorRing,
            className,
          )}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {iconRight && <span className="absolute right-3 text-fg-subtle">{iconRight}</span>}
      </div>
    </Field>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Textarea({ label, helperText, error, className, id, rows = 3, ...rest }: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} helperText={helperText} error={error} id={inputId}>
      <textarea
        id={inputId}
        rows={rows}
        className={cn(controlBase, "resize-y px-3 py-2 text-sm", error && errorRing, className)}
        {...rest}
      />
    </Field>
  );
}

export type SelectOption = string | { value: string; label: string };

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
};

export function Select({ label, helperText, error, options, placeholder, className, id, ...rest }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} helperText={helperText} error={error} id={inputId}>
      <select id={inputId} className={cn(controlBase, "h-10 px-3 text-sm", error && errorRing, className)} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2.5", disabled && "cursor-not-allowed opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-pill transition-colors duration-[200ms]",
          checked ? "bg-brand" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform duration-[200ms] ease-standard",
            checked && "translate-x-4",
          )}
        />
      </button>
      {label && <span className="text-sm text-fg">{label}</span>}
    </label>
  );
}
