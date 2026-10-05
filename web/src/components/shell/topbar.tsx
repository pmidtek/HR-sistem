"use client";

import * as Popover from "@radix-ui/react-popover";
import { Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { roleLabel } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useAuthed } from "@/store/app-provider";
import { markNotificationsRead } from "@/store/actions-business";
import { Avatar, Eyebrow } from "@/components/ui/display";
import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, team, today, theme, toggleTheme, logout } = useAuthed();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-transparent px-4 backdrop-blur-[12px] md:px-6">
      <IconButton label="Buka menu" className="lg:hidden" onClick={onMenu}>
        <Icon icon={Menu} size={18} />
      </IconButton>
      <div className="hidden md:block">
        <Eyebrow tone="success">Data dummy · {formatDate(today)}</Eyebrow>
      </div>
      <div className="flex-1" />
      <IconButton label={theme === "dark" ? "Mode terang" : "Mode gelap"} onClick={toggleTheme}>
        <Icon icon={theme === "dark" ? Sun : Moon} size={18} />
      </IconButton>
      <NotificationBell />
      <div className="ml-1 flex items-center gap-2.5 border-l border-line pl-3">
        <Avatar name={user.name} />
        <div className="hidden leading-tight sm:block">
          <p className="text-sm text-fg">{user.name}</p>
          <p className="text-xs text-fg-subtle">
            {roleLabel[user.role]} · {team?.name}
          </p>
        </div>
        <IconButton
          label="Keluar"
          size="small"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          <Icon icon={LogOut} />
        </IconButton>
      </div>
    </header>
  );
}

function NotificationBell() {
  const { state, user, run } = useAuthed();
  const mine = state.notifications.filter((n) => n.userId === user.id);
  const unread = mine.filter((n) => !n.read).length;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative inline-flex size-10 items-center justify-center rounded-xxs text-fg-muted hover:bg-hover hover:text-fg"
        >
          <Icon icon={Bell} size={18} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-brand px-1 font-mono text-[10px] leading-4 text-fg-on-brand">
              {unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-s bg-overlay backdrop-blur-xl shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-lg)]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-sm font-medium">Notifikasi</p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-fg-brand hover:underline"
                onClick={() => run((s) => markNotificationsRead(s, user.id))}
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {mine.length === 0 && <p className="px-4 py-8 text-center text-xs text-fg-muted">Belum ada notifikasi.</p>}
            {mine.map((n) => (
              <Popover.Close asChild key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => run((s) => markNotificationsRead(s, user.id, [n.id]))}
                  className={cn("flex gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-hover", !n.read && "bg-brand-subtle/40")}
                >
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm text-fg">{n.title}</span>
                    <span className="text-xs text-fg-muted">{n.body}</span>
                    <span className="font-mono text-[10px] text-fg-subtle">{formatDate(n.createdAt.slice(0, 10))}</span>
                  </span>
                </Link>
              </Popover.Close>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
