"use client";

import Link from "next/link";
import { useState } from "react";
import { allowedReimburseActions } from "@/lib/calc/approval";
import { claimTotal, inPeriod, stageOf, type PeriodFilter } from "@/lib/calc/reimburse";
import { formatDate, formatPeriod, formatRupiah } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { BarChart } from "../charts/bar-chart";
import { useLookups } from "../hooks";
import { stageMeta } from "../reimburse/parts";
import { defaultPeriod, PeriodFilterControl, periodLabel } from "../reimburse/period-filter";
import { lastMonths, monthlyByPayment, shortRp } from "../reimburse/recap-charts";
import { StatusFlow } from "../reimburse/status-flow";
import { usePayDate } from "../reimburse/use-pay-date";
import { CollapsibleSection } from "../ui/collapsible-section";
import { Badge } from "../ui/display";
import { Stagger } from "../ui/motion";
import { ActionTile, MiniList, Panel } from "./widgets";

/** Finance, HR & Stakeholder: antrian tindakan, alur reimburse perusahaan per periode, dan tren. */
export function ReimburseCompanySection() {
  const { state, actor, today } = useAuthed();
  const { userName } = useLookups();
  const payDate = usePayDate();
  const [period, setPeriod] = useState<PeriodFilter>(() => defaultPeriod(today));
  const all = state.reimbursements;
  const years = [...new Set(all.map((r) => Number(r.submittedAt.slice(0, 4))))];
  const inRange = all.filter((r) => inPeriod(r.submittedAt, period));
  const acts = (r: (typeof all)[number]) => allowedReimburseActions(actor, r.userId, r.status);
  const toReview = all.filter((r) => acts(r).some((a) => a === "forward" || a === "approve"));
  const toPay = all.filter((r) => acts(r).includes("mark_paid"));
  const overdue = toPay.filter((r) => payDate(r.submittedAt) < today);
  const queue = [...toReview, ...toPay].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const months = lastMonths(today);
  const data = monthlyByPayment(all, months);
  const href = "/reimburse-recap";

  return (
    <div className="flex flex-col gap-10">
      <CollapsibleSection id="dash-action" title="Needs your action" summary={`${toReview.length + toPay.length} item(s)`}>
        <Stagger as="section" className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <ActionTile label="To review" count={toReview.length} href="/approvals" />
          <ActionTile label="Ready to pay" count={toPay.length} href={href} />
          <ActionTile label="Overdue payments" count={overdue.length} href={href} />
        </Stagger>
      </CollapsibleSection>

      <CollapsibleSection id="dash-overview" title="Reimbursement overview" summary={periodLabel(period)} actions={<PeriodFilterControl value={period} onChange={setPeriod} today={today} years={years} />}>
        <StatusFlow list={inRange} title="Total submitted" />
      </CollapsibleSection>

      <CollapsibleSection id="dash-queue" title="Queue & trend" summary={`${queue.length} in your queue`}>
        <Stagger className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Panel title="Your queue" aside={<Link href={href} className="text-xs text-fg-brand hover:underline">Open recap</Link>}>
              <MiniList
                empty="Nothing waiting for you."
                items={queue.slice(0, 6).map((r) => {
                  const s = stageOf(r.status);
                  const late = s === "unpaid" && payDate(r.submittedAt) < today;
                  return {
                    key: r.id,
                    left: (
                      <Link href={s === "unpaid" ? href : "/approvals"} className="hover:text-fg-brand">
                        <span className="font-mono text-xs text-fg-subtle">{r.number}</span> {userName(r.userId)} · {formatRupiah(claimTotal(r))}
                      </Link>
                    ),
                    right: late ? <Badge tone="danger">Overdue</Badge> : (
                      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: stageMeta[s].color }} />{stageMeta[s].short}</span>
                    ),
                  };
                })}
              />
            </Panel>
            <Panel title="Paid vs not paid · last 6 months">
              <BarChart
                height={180}
                categories={months.map((m) => formatPeriod(m).slice(0, 3))}
                yFormat={shortRp}
                series={[
                  { key: "paid", label: "Paid", color: stageMeta.paid.color, values: data.map((d) => d.paid) },
                  { key: "unpaid", label: "Not paid", color: stageMeta.unpaid.color, values: data.map((d) => d.unpaid) },
                ]}
              />
            </Panel>
          </div>
        </Stagger>
      </CollapsibleSection>
    </div>
  );
}

/** Pegawai: ringkasan reimburse sendiri per periode. */
export function ReimburseMineSection() {
  const { state, user, today } = useAuthed();
  const payDate = usePayDate();
  const [period, setPeriod] = useState<PeriodFilter>(() => defaultPeriod(today));
  const mine = state.reimbursements.filter((r) => r.userId === user.id);
  const years = [...new Set(mine.map((r) => Number(r.submittedAt.slice(0, 4))))];
  const inRange = mine.filter((r) => inPeriod(r.submittedAt, period));
  const recent = [...mine].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 5);

  return (
    <div className="flex flex-col gap-10">
      <CollapsibleSection id="dash-mine" title="My reimbursements" summary={periodLabel(period)} actions={<PeriodFilterControl value={period} onChange={setPeriod} today={today} years={years} />}>
        <StatusFlow list={inRange} title="Total submitted" />
      </CollapsibleSection>
      <CollapsibleSection id="dash-recent" title="Recent claims" summary={`${recent.length} latest`}>
      <Stagger>
        <Panel title="Recent claims" aside={<Link href="/reimbursements" className="text-xs text-fg-brand hover:underline">New / view all</Link>}>
          <MiniList
            empty="No claims yet."
            items={recent.map((r) => ({
              key: r.id,
              left: <Link href="/reimbursements" className="hover:text-fg-brand"><span className="font-mono text-xs text-fg-subtle">{r.number}</span> {r.title} · {formatRupiah(claimTotal(r))}</Link>,
              right: r.status === "rejected" ? <Badge tone="danger">Rejected</Badge>
                : r.paidAt ? <Badge tone="success">Paid {formatDate(r.paidAt)}</Badge>
                : r.status === "revision" ? <Badge tone="warning">Needs revision</Badge>
                : `Est. pay ${formatDate(payDate(r.submittedAt))}`,
            }))}
          />
        </Panel>
      </Stagger>
      </CollapsibleSection>
    </div>
  );
}
