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

type Tab = "leave" | "overtime" | "reimburse";

export default function ApprovalsPage() {
  const { state, actor } = useAuthed();
  const pending = pendingFor(state, actor);
  const initial: Tab = actor.role === "finance" ? "reimburse" : "leave";
  const [tab, setTab] = useState<Tab>(initial);
  const [showDone, setShowDone] = useState<"pending" | "history">("pending");
  const [decision, setDecision] = useState<Decision | null>(null);

  return (
    <>
      <PageHeader
        title="Persetujuan"
        accent="menunggu Anda."
        description="Tidak ada yang bisa menyetujui pengajuannya sendiri. Setiap keputusan tercatat di riwayat."
      />

      {pending.payroll > 0 && (
        <Card tone="brand" className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm">Ada {pending.payroll} payroll yang menunggu persetujuan Anda.</p>
          <Link href="/payroll" className={buttonClass({ size: "small" })}>Buka payroll</Link>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "leave", label: "Cuti", count: pending.leave },
            { value: "overtime", label: "Lembur", count: pending.overtime },
            { value: "reimburse", label: "Reimburse", count: pending.reimburse },
          ]}
        />
        <Tabs
          variant="pill"
          value={showDone}
          onChange={setShowDone}
          tabs={[{ value: "pending", label: "Perlu tindakan" }, { value: "history", label: "Semua" }]}
        />
      </div>

      {tab === "leave" && <LeaveQueue onlyPending={showDone === "pending"} onDecide={setDecision} />}
      {tab === "overtime" && <OvertimeQueue onlyPending={showDone === "pending"} onDecide={setDecision} />}
      {tab === "reimburse" && <ReimburseQueue onlyPending={showDone === "pending"} onDecide={setDecision} />}

      {decision && <DecisionDialog decision={decision} onClose={() => setDecision(null)} />}
    </>
  );
}
