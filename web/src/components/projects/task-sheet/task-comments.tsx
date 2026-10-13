"use client";

import { useState } from "react";
import { formatRelative } from "@/lib/format";
import type { ActivityLog } from "@/lib/project-types";
import type { Task, User } from "@/lib/types";
import { Avatar } from "../../ui/display";
import { Button } from "../../ui/button";
import { Markdown } from "../../ui/markdown";
import { SheetSection } from "./task-sections";

type Props = {
  task: Task;
  members: User[];
  history: ActivityLog[];
  now: string;
  editable: boolean;
  userName: (id: string | null) => string;
  onComment: (body: string) => boolean;
};

/** Komentar (dengan @mention anggota) dan riwayat aktivitas task. */
export function TaskComments({ task, members, history, now, editable, userName, onComment }: Props) {
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<"comments" | "history">("comments");
  const mention = (u: User) => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}@${u.name.split(" ")[0]} `);
  const send = () => {
    if (body.trim() && onComment(body)) setBody("");
  };

  return (
    <SheetSection
      title={tab === "comments" ? `Komentar (${task.comments.length})` : "Riwayat"}
      aside={
        <span className="flex gap-3 text-xs">
          <button type="button" onClick={() => setTab("comments")} className={tab === "comments" ? "text-fg" : "text-fg-muted hover:text-fg"}>Komentar</button>
          <button type="button" onClick={() => setTab("history")} className={tab === "history" ? "text-fg" : "text-fg-muted hover:text-fg"}>Riwayat</button>
        </span>
      }
    >
      {tab === "history" ? (
        <ol className="flex flex-col gap-2">
          {history.length === 0 && <li className="text-xs text-fg-subtle">Belum ada riwayat.</li>}
          {history.map((a) => (
            <li key={a.id} className="flex gap-2 text-xs">
              <span className="text-fg">{userName(a.actorId)}</span>
              <span className="flex-1 text-fg-muted">{a.text}</span>
              <span className="text-fg-subtle">{formatRelative(a.at, now)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <>
          {task.comments.length === 0 && <p className="text-xs text-fg-subtle">Belum ada komentar.</p>}
          {task.comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar name={userName(c.authorId)} size="small" />
              <div className="min-w-0 flex-1">
                <p className="text-xs"><span className="font-medium text-fg">{userName(c.authorId)}</span> <span className="text-fg-subtle">· {formatRelative(c.createdAt, now)}</span></p>
                <Markdown className="mt-0.5">{c.body.replace(/@(\w+)/g, "**@$1**")}</Markdown>
              </div>
            </div>
          ))}
          {editable && (
            <div className="flex flex-col gap-2">
              <textarea
                value={body} rows={3} onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && send()}
                placeholder="Tulis komentar… (Ctrl/⌘ + Enter untuk kirim)"
                className="w-full resize-y rounded-xxs bg-sunken p-3 text-sm shadow-[inset_0_0_0_1px_var(--border-default)] focus:shadow-[inset_0_0_0_1px_var(--brand)] focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-fg-subtle">Sebut:</span>
                {members.map((u) => (
                  <button key={u.id} type="button" onClick={() => mention(u)} className="rounded-pill bg-hover px-2 py-0.5 text-xs text-fg-muted hover:text-fg">@{u.name.split(" ")[0]}</button>
                ))}
                <Button size="small" className="ml-auto" disabled={!body.trim()} onClick={send}>Kirim</Button>
              </div>
            </div>
          )}
        </>
      )}
    </SheetSection>
  );
}
