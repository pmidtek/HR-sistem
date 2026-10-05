"use client";

import type { ApprovalLog } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useLookups } from "./hooks";

type Props = { logs: ApprovalLog[]; labels: Record<string, string> };

/** Riwayat transisi status (dari approval_logs). */
export function ApprovalTimeline({ logs, labels }: Props) {
  const { userName } = useLookups();
  if (logs.length === 0) return null;
  return (
    <ol className="flex flex-col gap-2 border-l border-line pl-4">
      {logs.map((l, i) => (
        <li key={i} className="relative text-xs">
          <span className="absolute top-1 -left-[19px] size-1.5 rounded-full bg-fg-subtle" />
          <span className="text-fg">{labels[l.to] ?? l.to}</span>
          <span className="text-fg-subtle">
            {" "}
            · {userName(l.byUserId)} · {formatDate(l.at.slice(0, 10))}
          </span>
          {l.note && <p className="mt-0.5 text-fg-muted">&ldquo;{l.note}&rdquo;</p>}
        </li>
      ))}
    </ol>
  );
}
