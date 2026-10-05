"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { allowedLeaveActions, leaveStatusLabel } from "@/lib/calc/approval";
import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { actOnLeave } from "@/store/actions";
import { ApprovalTimeline } from "@/components/approval-timeline";
import { LeaveForm } from "@/components/leave/leave-form";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";
import { ApprovalBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Stat } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";

export default function LeavePage() {
  const { state, user, actor, today, run } = useAuthed();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const balance = state.leaveBalances.find((b) => b.userId === user.id && b.leaveTypeId === "annual");
  const mine = state.leaveRequests.filter((r) => r.userId === user.id);
  const typeName = (id: string) => state.leaveTypes.find((t) => t.id === id)?.name ?? id;
  const pendingDays = mine.filter((r) => r.status.startsWith("pending") && r.leaveTypeId === "annual").reduce((s, r) => s + r.workingDays, 0);

  return (
    <>
      <PageHeader
        title="Cuti"
        accent="dan saldo."
        description="Hari yang dihitung hanya hari kerja. Akhir pekan dan libur nasional tidak memotong saldo."
        actions={
          <Button iconLeft={<Icon icon={Plus} />} onClick={() => { setFormKey((k) => k + 1); setOpen(true); }}>
            Ajukan cuti
          </Button>
        }
      />

      <Card padding="lg" className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Kuota Cuti Tahunan 2026" value={balance?.quota ?? 0} sub="hari kerja" />
        <Stat label="Terpakai" value={balance?.used ?? 0} sub="hari" />
        <Stat label="Sisa" value={<span className="text-fg-brand">{balance ? balance.quota - balance.used : 0}</span>} sub="hari" />
        <Stat label="Sedang diajukan" value={pendingDays} sub="hari, belum diputuskan" />
      </Card>

      <SectionTitle>Pengajuan saya</SectionTitle>
      {mine.length === 0 ? (
        <EmptyState title="Belum ada pengajuan cuti" description="Pengajuan yang Anda buat akan muncul di sini beserta statusnya." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {mine.map((r) => {
            const canCancel = allowedLeaveActions(actor, r.userId, r.status, { startDate: r.startDate, today }).includes("cancel");
            return (
              <Card key={r.id} className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-medium">{typeName(r.leaveTypeId)}</p>
                    <p className="text-sm text-fg-muted">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)} · <span className="font-mono">{r.workingDays} hari kerja</span>
                    </p>
                  </div>
                  <ApprovalBadge status={r.status} />
                </div>
                <p className="text-sm text-fg">{r.reason}</p>
                <ApprovalTimeline logs={r.logs} labels={leaveStatusLabel} />
                {canCancel && (
                  <div>
                    <Button variant="secondary" tone="danger" size="small" onClick={() => run((s) => actOnLeave(s, r.id, "cancel", actor, today), "Pengajuan dibatalkan.")}>
                      Batalkan
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {open && <LeaveForm key={formKey} open={open} onOpenChange={setOpen} />}
    </>
  );
}
