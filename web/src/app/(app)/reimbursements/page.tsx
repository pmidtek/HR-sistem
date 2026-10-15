"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { stageOf, type Stage } from "@/lib/calc/reimburse";
import type { Reimbursement } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { ClaimDetail } from "@/components/reimburse/claim-detail";
import { ClaimTable } from "@/components/reimburse/claim-table";
import { stageMeta } from "@/components/reimburse/parts";
import { ReimburseSheet } from "@/components/reimburse/reimburse-sheet";
import { StatusFlow } from "@/components/reimburse/status-flow";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Editor = { key: number; editing?: Reimbursement } | null;

export default function ReimbursementsPage() {
  const { state, user } = useAuthed();
  const [editor, setEditor] = useState<Editor>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const mine = state.reimbursements.filter((r) => r.userId === user.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const shown = stage ? mine.filter((r) => stageOf(r.status) === stage) : mine;
  const open = openId ? state.reimbursements.find((r) => r.id === openId) : undefined;

  function startEditor(editing?: Reimbursement) {
    setOpenId(null);
    setEditor((e) => ({ key: (e?.key ?? 0) + 1, editing }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <PageHeader
        title="Reimburse"
        accent="tanpa ribet."
        description={state.settings.payroll.reimburseViaPayroll ? "Yang sudah disetujui dibayar lewat payroll atau transfer oleh Finance." : "Yang sudah disetujui dibayar terpisah oleh Finance."}
        actions={!editor && <Button iconLeft={<Icon icon={Plus} />} onClick={() => startEditor()}>Ajukan reimburse</Button>}
      />

      {editor && <ReimburseSheet key={editor.key} editing={editor.editing} onClose={() => setEditor(null)} />}

      <div className="mb-8">
        <StatusFlow list={mine} selected={stage} onSelect={setStage} title="Total reimburse saya" />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionTitle>{stage ? `Pengajuan · ${stageMeta[stage].label}` : "Pengajuan saya"}</SectionTitle>
        {stage && <button type="button" onClick={() => setStage(null)} className="text-xs text-fg-brand hover:underline">Tampilkan semua</button>}
      </div>
      <ClaimTable list={shown} onOpen={setOpenId} />

      {open && <ClaimDetail claim={open} onClose={() => setOpenId(null)} onRevise={startEditor} />}
    </>
  );
}
