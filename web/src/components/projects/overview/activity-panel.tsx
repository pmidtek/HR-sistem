"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatRelative } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { stamp } from "@/store/project-core";
import { useLookups } from "../../hooks";
import { Button } from "../../ui/button";
import { Avatar } from "../../ui/display";
import { Icon } from "../../ui/icon";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

const PAGE = 15;

/** Feed activity project (Overview g): aktor tebal, teks, ref #nomor bisa diklik, waktu relatif. */
export function ActivityPanel({ data }: { data: ProjectData }) {
  const { state, today } = useAuthed();
  const { project, base } = useProject();
  const { userName } = useLookups();
  const [limit, setLimit] = useState(PAGE);
  const logs = state.activityLogs.filter((a) => a.projectId === project.id);
  const now = stamp(today);
  const taskByRef = new Map(data.tasks.map((t) => [`#${t.number}`, t]));

  return (
    <aside className="glass flex max-h-[calc(100vh-120px)] flex-col rounded-m shadow-[inset_0_0_0_1px_var(--border-default),var(--glass-highlight)] lg:sticky lg:top-20">
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="flex size-8 items-center justify-center rounded-xs bg-hover text-fg-muted"><Icon icon={Activity} size={16} /></span>
        <h2 className="font-display text-sm font-medium">Activity</h2>
        <span className="ml-auto font-mono text-[11px] text-fg-subtle">{logs.length}</span>
      </header>
      <ol className="flex-1 overflow-y-auto px-5 py-3">
        {logs.length === 0 && <li className="py-6 text-center text-xs text-fg-muted">Belum ada aktivitas.</li>}
        {logs.slice(0, limit).map((a) => {
          const task = a.targetRef ? taskByRef.get(a.targetRef) : undefined;
          return (
            <li key={a.id} className="flex gap-3 py-2.5">
              <Avatar name={userName(a.actorId)} size="small" color="brand" />
              <div className="min-w-0 flex-1 text-sm leading-snug">
                <span className="font-medium text-fg">{userName(a.actorId)}</span>{" "}
                <span className="text-fg-muted">{a.text}</span>
                {a.targetRef && (
                  task ? (
                    <Link href={`${base}/board?board=${task.boardId}&task=${task.id}`} className="ml-1 font-mono text-xs text-fg-brand hover:underline">({a.targetRef})</Link>
                  ) : (
                    <span className="ml-1 font-mono text-xs text-fg-brand">({a.targetRef})</span>
                  )
                )}
                <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">{formatRelative(a.at, now)}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {limit < logs.length && (
        <div className="border-t border-line p-3">
          <Button variant="ghost" tone="neutral" size="small" fullWidth onClick={() => setLimit((l) => l + PAGE)}>Muat lebih ({logs.length - limit})</Button>
        </div>
      )}
    </aside>
  );
}
