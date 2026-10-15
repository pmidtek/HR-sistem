"use client";

import { Download, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { allowedReimburseActions } from "@/lib/calc/approval";
import { claimTotal, inPeriod, recapBy, stageOf, type PeriodFilter, type Stage } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { useLookups } from "@/components/hooks";
import { ClaimDetail } from "@/components/reimburse/claim-detail";
import { ClaimTable } from "@/components/reimburse/claim-table";
import { exportReimburseCsv } from "@/components/reimburse/export";
import { stageMeta } from "@/components/reimburse/parts";
import { PayDialog } from "@/components/reimburse/pay-dialog";
import { defaultPeriod, PeriodFilterControl, periodLabel } from "@/components/reimburse/period-filter";
import { RecapCharts } from "@/components/reimburse/recap-charts";
import { StatusFlow } from "@/components/reimburse/status-flow";
import { usePayDate } from "@/components/reimburse/use-pay-date";
import { PageHeader } from "@/components/shell/page-header";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default function ReimburseRecapPage() {
  const { state, actor, today } = useAuthed();
  const { userName, teamName } = useLookups();
  const payDate = usePayDate();
  const categoryName = (id: string) => state.reimbursementCategories.find((c) => c.id === id)?.name ?? id;
  const years = [...new Set(state.reimbursements.map((r) => Number(r.submittedAt.slice(0, 4))))];
  const [period, setPeriod] = useState<PeriodFilter>(() => defaultPeriod(today));
  const [userId, setUserId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stage, setStage] = useState<Stage | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<string[] | null>(null);

  // Grafik bulanan memakai semua filter kecuali periode, supaya tren tetap terlihat.
  const base = useMemo(
    () => state.reimbursements.filter((r) => (!userId || r.userId === userId) && (!categoryId || r.items.some((i) => i.categoryId === categoryId))),
    [state.reimbursements, userId, categoryId],
  );
  const inRange = base.filter((r) => inPeriod(r.submittedAt, period));
  const list = (stage ? inRange.filter((r) => stageOf(r.status) === stage) : inRange).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const payable = new Set(list.filter((r) => allowedReimburseActions(actor, r.userId, r.status).includes("mark_paid")).map((r) => r.id));
  const selected = [...picked].filter((id) => payable.has(id));
  const selectedTotal = state.reimbursements.filter((r) => selected.includes(r.id)).reduce((s, r) => s + claimTotal(r), 0);
  const overdue = base.filter((r) => r.status === "approved" && payDate(r.submittedAt) < today);
  const byUser = [...recapBy(inRange, (r) => r.userId).entries()].sort((a, b) => b[1].total - a[1].total);
  const open = openId ? state.reimbursements.find((r) => r.id === openId) : undefined;
  const userOptions = [{ value: "", label: "All employees" }, ...state.users.map((u) => ({ value: u.id, label: u.name, hint: teamName(u.teamId) }))];

  return (
    <>
      <PageHeader title="Reimbursement recap" description="Track every claim from review to payment. Click a stage to filter, click a claim for details." />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <PeriodFilterControl value={period} onChange={(p) => { setPeriod(p); setStage(null); }} today={today} years={years} />
        <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-2">
          <div className="sm:w-56"><Combobox value={userId} onChange={setUserId} options={userOptions} /></div>
          <div className="sm:w-56"><Select value={categoryId} placeholder="All categories" onChange={(e) => setCategoryId(e.target.value)} options={state.reimbursementCategories.map((c) => ({ value: c.id, label: c.name }))} /></div>
        </div>
      </div>

      {overdue.length > 0 && (
        <button type="button" onClick={() => { setPeriod({ kind: "all" }); setStage("unpaid"); }} className="mb-4 flex w-full items-center justify-between gap-3 rounded-s bg-danger-subtle px-4 py-3 text-left text-sm text-fg-danger">
          <span>{overdue.length} approved claim(s) are past their pay date · {formatRupiah(overdue.reduce((s, r) => s + claimTotal(r), 0))}</span>
          <span className="text-xs underline">Show</span>
        </button>
      )}

      <CollapsibleSection id="recap-overview" title="Overview" summary={periodLabel(period)} className="mb-8">
        <StatusFlow list={inRange} selected={stage} onSelect={setStage} title="Total submitted" />
      </CollapsibleSection>

      <CollapsibleSection id="recap-charts" title="Trends & breakdown" summary="by month, category, project code" defaultOpen={false} className="mb-8">
        <RecapCharts list={base} periodList={inRange} today={today} categoryName={categoryName} />
      </CollapsibleSection>

      <CollapsibleSection id="recap-people" title="By employee" summary={`${byUser.length} employee(s) · ${periodLabel(period)}`} defaultOpen={false} className="mb-8">
        <Table>
          <thead>
            <tr>
              <Th>Employee</Th><Th className="text-right">Claims</Th><Th className="text-right">Submitted</Th><Th className="text-right">In review</Th>
              <Th className="text-right">Not paid</Th><Th className="text-right">Paid</Th><Th className="text-right">Declined</Th>
            </tr>
          </thead>
          <tbody>
            {byUser.length === 0 && <Tr><Td colSpan={7} className="text-center text-sm text-fg-muted">No claims in this period.</Td></Tr>}
            {byUser.map(([id, u]) => (
              <Tr key={id} className={cn("cursor-pointer", userId === id && "bg-hover")} onClick={() => setUserId(userId === id ? "" : id)}>
                <Td>
                  <p className="text-sm">{userName(id)}</p>
                  <p className="text-xs text-fg-subtle">{teamName(state.users.find((x) => x.id === id)?.teamId ?? "")}</p>
                </Td>
                <Td className="text-right font-mono text-xs">{u.count}</Td>
                <Td className="text-right font-mono text-xs">{formatRupiah(u.total)}</Td>
                <Td className="text-right font-mono text-xs">{formatRupiah(u.inProcess)}</Td>
                <Td className={cn("text-right font-mono text-xs", u.unpaid > 0 && "text-warning")}>{formatRupiah(u.unpaid)}</Td>
                <Td className="text-right font-mono text-xs text-fg-success">{formatRupiah(u.paid)}</Td>
                <Td className={cn("text-right font-mono text-xs", u.declined > 0 && "text-fg-danger")}>{formatRupiah(u.declined)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <p className="mt-2 text-xs text-fg-subtle">Click an employee to filter.</p>
      </CollapsibleSection>

      <CollapsibleSection
        id="recap-claims"
        title={stage ? `Claims · ${stageMeta[stage].label}` : "All claims"}
        summary={`${list.length} claim(s)`}
        actions={<>
          {stage && <button type="button" onClick={() => setStage(null)} className="text-xs text-fg-brand hover:underline">Show all</button>}
          {payable.size > 0 && (
            <Button size="small" disabled={selected.length === 0} iconLeft={<Icon icon={Wallet} size={14} />} onClick={() => setPaying(selected)}>
              Pay{selected.length > 0 ? ` ${selected.length} claim(s) · ${formatRupiah(selectedTotal)}` : " selected"}
            </Button>
          )}
          <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Download} size={14} />} disabled={list.length === 0} onClick={() => exportReimburseCsv(list, userName, categoryName, `reimbursement-recap-${today}.csv`)}>
            Export to Excel
          </Button>
        </>}
      >
        <ClaimTable list={list} onOpen={setOpenId} showOwner selection={payable.size > 0 ? { selectable: payable, picked, onChange: setPicked } : undefined} empty="No claims" />
      </CollapsibleSection>

      {open && <ClaimDetail claim={open} onClose={() => setOpenId(null)} onPay={(ids) => setPaying(ids)} />}
      {paying && <PayDialog ids={paying} onClose={() => setPaying(null)} onDone={() => setPicked(new Set())} />}
    </>
  );
}
