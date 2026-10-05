import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  /** Kata yang ditulis italic di headline (gaya Cartogram). */
  accent?: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, accent, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-4xl leading-[1.1] tracking-[-0.01em] text-fg">
          {title} {accent && <em className="text-fg-brand">{accent}</em>}
        </h1>
        {description && <p className="max-w-2xl text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-base font-medium text-fg">{children}</h2>
      {aside}
    </div>
  );
}
