"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "../../ui/icon";
import { useProject } from "./context";
import { activeSlug, projectNav } from "./nav-items";

/** Sidebar menu project. Di layar < 768px berubah jadi tab horizontal yang bisa di-scroll. */
export function ProjectNav() {
  const pathname = usePathname();
  const { base, canManage } = useProject();
  const active = activeSlug(pathname, base);
  const items = projectNav.filter((i) => !i.manageOnly || canManage);

  return (
    <nav aria-label="Menu project" className="md:sticky md:top-20 md:self-start">
      <ul className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 pb-2 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:border-b-0 md:px-0 md:pb-0">
        {items.map((item) => {
          const isActive = item.slug === active;
          return (
            <li key={item.slug} className="shrink-0">
              <Link
                href={item.slug ? `${base}/${item.slug}` : base}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-xs px-3 text-sm whitespace-nowrap transition-colors duration-[120ms]",
                  isActive ? "bg-brand-subtle text-fg-brand" : "text-fg-muted hover:bg-hover hover:text-fg",
                )}
              >
                <Icon icon={item.icon} size={16} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
