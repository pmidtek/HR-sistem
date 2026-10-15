"use client";

import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { claimGross, inPeriod, stageOf, type PeriodFilter, type Stage } from "@/lib/calc/reimburse";
import { formatRupiah } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { ClaimDetail } from "@/components/reimburse/claim-detail";
import { ClaimTable } from "@/components/reimburse/claim-table";
import { stageMeta } from "@/components/reimburse/parts";
import { defaultPeriod, PeriodFilterControl, periodLabel } from "@/components/reimburse/period-filter";
import { ReimburseSheet } from "@/components/reimburse/reimburse-sheet";
import { StatusFlow } from "@/components/reimburse/status-flow";
import { PageHeader } from "@/components/shell/page-header";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Editor = { key: number; editing?: Reimbursement } | null;

export default function ReimbursementsPage() {
  return (
    <Suspense>
      <ReimbursementsContent />
    </Suspense>
  );
}

function ReimbursementsContent() {
  const { state, user, today } = useAuthed();
  const [editor, setEditor] = useState<Editor>(null);
  const [period, setPeriod] = useState<PeriodFilter>(() => defaultPeriod(today));
  const [stage, setStage] = useState<Stage | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const mine = state.reimbursements.filter((r) => r.userId === user.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const years = [...new Set(mine.map((r) => Number(r.submittedAt.slice(0, 4))))];
  const inRange = mine.filter((r) => inPeriod(r.submittedAt, period));
  const shown = stage ? inRange.filter((r) => stageOf(r.status) === stage) : inRange;
  // Dari notifikasi: /reimbursements?claim=<id> langsung membuka detail pengajuan itu.
  const router = useRouter();
  const claimParam = useSearchParams().get("claim");
  const activeId = openId ?? claimParam;
  const open = activeId ? mine.find((r) => r.id === activeId) : undefined;
  const closeDetail = () => {
    setOpenId(null);
    if (claimParam) router.replace("/reimbursements", { scroll: false });
  };

  // Form pengajuan ada di bawah daftar; gulir ke sana saat dibuka.
  useEffect(() => {
    if (editor) editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editor]);

  function startEditor(editing?: Reimbursement) {
    closeDetail();
    setEditor((e) => ({ key: (e?.key ?? 0) + 1, editing }));
  }

  return (
    <>
      <PageHeader
        title="Reimbursement"
        description="Submit your expenses, track approval, and see when they get paid."
        actions={<Button iconLeft={<Icon icon={Plus} />} onClick={() => startEditor()}>New reimbursement</Button>}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Showing <span className="text-fg">{periodLabel(period)}</span></p>
        <PeriodFilterControl value={period} onChange={(p) => { setPeriod(p); setStage(null); }} today={today} years={years} />
      </div>

      <CollapsibleSection id="emp-overview" title="Overview" summary={`${formatRupiah(inRange.reduce((t, r) => t + claimGross(r), 0))} · ${inRange.length} claim(s)`} className="mb-8">
        <StatusFlow list={inRange} selected={stage} onSelect={setStage} title="Total submitted" />
      </CollapsibleSection>

      <CollapsibleSection
        id="emp-claims"
        title={stage ? `My claims · ${stageMeta[stage].label}` : "My claims"}
        summary={`${shown.length} claim(s)`}
        actions={stage && <button type="button" onClick={() => setStage(null)} className="text-xs text-fg-brand hover:underline">Show all</button>}
      >
        <ClaimTable list={shown} onOpen={setOpenId} empty={`No claims in ${periodLabel(period)}`} />
      </CollapsibleSection>

      <div ref={editorRef} className="scroll-mt-6 pt-8">
        {editor ? (
          <ReimburseSheet key={editor.key} editing={editor.editing} onClose={() => setEditor(null)} />
        ) : (
          <button
            type="button"
            onClick={() => startEditor()}
            className="flex w-full items-center justify-center gap-2 rounded-s border border-dashed border-line-strong py-6 text-sm text-fg-muted transition-colors hover:bg-hover hover:text-fg"
          >
            <Icon icon={Plus} size={16} /> New reimbursement
          </button>
        )}
      </div>

      {open && <ClaimDetail claim={open} onClose={closeDetail} onRevise={startEditor} />}
    </>
  );
}
