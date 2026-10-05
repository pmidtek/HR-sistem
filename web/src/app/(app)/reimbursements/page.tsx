"use client";

import { FileImage, Plus } from "lucide-react";
import { useState } from "react";
import { allowedReimburseActions, reimburseStatusLabel } from "@/lib/calc/approval";
import { formatDate, formatRupiah } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { actOnReimburse } from "@/store/actions";
import { ApprovalTimeline } from "@/components/approval-timeline";
import { ReimburseForm } from "@/components/reimburse/reimburse-form";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";
import { ReimburseBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Stat } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";

export default function ReimbursementsPage() {
  const { state, user, actor, today, run } = useAuthed();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const mine = state.reimbursements.filter((r) => r.userId === user.id);
  const categoryName = (id: string) => state.reimbursementCategories.find((c) => c.id === id)?.name ?? id;
  const sum = (pred: (s: string) => boolean) => mine.filter((r) => pred(r.status)).reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader
        title="Reimburse"
        accent="tanpa ribet."
        description={state.settings.payroll.reimburseViaPayroll ? "Reimburse yang disetujui dibayarkan lewat payroll bulan berjalan." : "Reimburse yang disetujui dibayar terpisah oleh Finance."}
        actions={<Button iconLeft={<Icon icon={Plus} />} onClick={() => { setFormKey((k) => k + 1); setOpen(true); }}>Ajukan reimburse</Button>}
      />

      <Card padding="lg" className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Stat label="Dalam proses" value={formatRupiah(sum((s) => s.startsWith("pending") || s === "revision"))} />
        <Stat label="Disetujui, belum dibayar" value={formatRupiah(sum((s) => s === "approved"))} />
        <Stat label="Sudah dibayar" value={formatRupiah(sum((s) => s === "paid"))} />
      </Card>

      <SectionTitle>Pengajuan saya</SectionTitle>
      {mine.length === 0 ? (
        <EmptyState title="Belum ada reimburse" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {mine.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-2xl leading-none">{formatRupiah(r.amount)}</p>
                  <p className="mt-1 text-sm text-fg-muted">
                    {categoryName(r.categoryId)} · {formatDate(r.date)} · <span className="font-mono text-fg-brand">{r.projectCode}</span>
                  </p>
                </div>
                <ReimburseBadge status={r.status} />
              </div>
              <p className="text-sm">{r.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {r.files.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5 rounded-xxs bg-sunken px-2 py-1 text-xs text-fg-muted">
                    <Icon icon={FileImage} size={12} /> {f}
                  </span>
                ))}
              </div>
              {r.paidAt && <p className="text-xs text-fg-success">Dibayar {formatDate(r.paidAt)}</p>}
              <ApprovalTimeline logs={r.logs} labels={reimburseStatusLabel} />
              {allowedReimburseActions(actor, r.userId, r.status).includes("resubmit") && (
                <div>
                  <Button size="small" onClick={() => run((s) => actOnReimburse(s, r.id, "resubmit", actor, today), "Dikirim ulang ke Finance.")}>
                    Perbaiki & kirim ulang
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {open && <ReimburseForm key={formKey} open={open} onOpenChange={setOpen} />}
    </>
  );
}
