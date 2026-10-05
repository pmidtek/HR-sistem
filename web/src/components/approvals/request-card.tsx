"use client";

import type { ReactNode } from "react";
import type { ApprovalLog } from "@/lib/types";
import { ApprovalTimeline } from "../approval-timeline";
import { useLookups } from "../hooks";
import { Avatar, Card } from "../ui/display";

type Props = {
  userId: string;
  kind: string;
  badge: ReactNode;
  headline: ReactNode;
  detail?: ReactNode;
  logs: ApprovalLog[];
  labels: Record<string, string>;
  actions?: ReactNode;
};

export function RequestCard({ userId, kind, badge, headline, detail, logs, labels, actions }: Props) {
  const { userName, user, teamName } = useLookups();
  const u = user(userId);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={userName(userId)} />
          <div>
            <p className="text-sm text-fg">{userName(userId)}</p>
            <p className="text-xs text-fg-subtle">
              {kind} · {u ? teamName(u.teamId) : ""}
            </p>
          </div>
        </div>
        {badge}
      </div>
      <div>
        <div className="font-display text-base font-medium">{headline}</div>
        {detail && <div className="mt-1 text-sm text-fg-muted">{detail}</div>}
      </div>
      <ApprovalTimeline logs={logs} labels={labels} />
      {actions && <div className="flex flex-wrap gap-2 border-t border-line pt-4">{actions}</div>}
    </Card>
  );
}
