"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccess, navGroups } from "@/lib/access";
import { cn } from "@/lib/cn";
import { useAuthed } from "@/store/app-provider";
import { Icon } from "@/components/ui/icon";
import { IdtekLogo, PoweredByCartogram } from "@/components/brand/logos";
import { pendingCountFor } from "./pending";

export function Logo() {
  return <IdtekLogo />;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, team, state, actor } = useAuthed();
  const pending = pendingCountFor(state, actor);

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="px-2">
        <Logo />
      </div>
      {navGroups.map((group) => {
        const items = group.items.filter((i) => canAccess(user, team, i.feature));
        if (items.length === 0) return null;
        return (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-2.5 pb-1.5 font-mono text-[10px] tracking-[0.08em] text-fg-subtle uppercase">{group.label}</p>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = item.feature === "approvals" ? pending : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-xs px-2.5 text-sm transition-colors duration-[120ms]",
                    active ? "bg-brand-subtle text-fg-brand" : "text-fg-muted hover:bg-hover hover:text-fg",
                  )}
                >
                  <Icon icon={item.icon} size={16} />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span className="rounded-xxs bg-brand px-1.5 font-mono text-[10px] leading-[18px] text-fg-on-brand">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
      <div className="mt-auto px-2.5 pt-4">
        <PoweredByCartogram />
      </div>
    </nav>
  );
}
