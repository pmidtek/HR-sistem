"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthed } from "@/store/app-provider";
import { PageHeader } from "@/components/shell/page-header";
import { pendingFor } from "@/components/shell/pending";
import { DecisionDialog, type Decision } from "@/components/approvals/decision-dialog";
import { LeaveQueue, OvertimeQueue, ReimburseQueue } from "@/components/approvals/queues";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { isReleased } from "@/lib/access";

type Tab = "leave" | "overtime" | "reimburse";

export default function ApprovalsPage() {
  const { state, actor } = useAuthed();
  const pending = pendingFor(state, actor);
  const tabs = ([
    { value: "leave", label: "Leave", count: pending.leave, released: isReleased("leave") },
    { value: "overtime", label: "Overtime", count: pending.overtime, released: isReleased("overtime") },
    { value: "reimburse", label: "Reimbursement", count: pending.reimburse, released: isReleased("reimbursements") },
  ] satisfies { value: Tab; label: string; count: number; released: boolean }[]).filter((t) => t.released);
  const initial: Tab = actor.role === "finance" || !isReleased("leave") ? "reimburse" : "leave";
  const [tab, setTab] = useState<Tab>(initial);
  const [showDone, setShowDone] = useState<"pending" | "history">("pending");
  const [decision, setDecision] = useState<Decision | null>(null);

  return (
    <>
      <PageHeader
        title="Approvals"
        description="No one can approve their own request. Every decision is recorded in the history."
      />

      {pending.payroll > 0 && isReleased("payroll") && (
        <Card tone="brand" className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm">{pending.payroll} payroll run(s) waiting for your approval.</p>
          <Link href="/payroll" className={buttonClass({ size: "small" })}>Open payroll</Link>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {tabs.length > 1 ? <Tabs value={tab} onChange={setTab} tabs={tabs} /> : <span />}
        <Tabs
          variant="pill"
          value={showDone}
          onChange={setShowDone}
          tabs={[{ value: "pending", label: "Needs action" }, { value: "history", label: "All" }]}
        />
      </div>

      {tab === "leave" && <LeaveQueue onlyPending={showDone === "pending"} onDecide={setDecision} />}
      {tab === "overtime" && <OvertimeQueue onlyPending={showDone === "pending"} onDecide={setDecision} />}
      {tab === "reimburse" && <ReimburseQueue onlyPending={showDone === "pending"} onDecide={setDecision} />}

      {decision && <DecisionDialog decision={decision} onClose={() => setDecision(null)} />}
    </>
  );
}
