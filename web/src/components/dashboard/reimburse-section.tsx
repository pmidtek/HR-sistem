"use client";

import Link from "next/link";
import { allowedReimburseActions } from "@/lib/calc/approval";
import { claimTotal, stageOf, stageTotals } from "@/lib/calc/reimburse";
import { formatDate, formatPeriod, formatRupiah } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { BarChart } from "../charts/bar-chart";
import { useLookups } from "../hooks";
import { stageMeta } from "../reimburse/parts";
import { lastMonths, monthlyByPayment, shortRp } from "../reimburse/recap-charts";
import { StatusFlow } from "../reimburse/status-flow";
import { Badge } from "../ui/display";
import { Stagger, StaggerItem } from "../ui/motion";
import { MiniList, Panel } from "./widgets";

/** Finance & Stakeholder: alur reimburse perusahaan, antrian tindakan, dan tren. */
export function ReimburseCompanySection() {
  const { state, actor, today } = useAuthed();
  const { userName } = useLookups();
  const all = state.reimbursements;
  const mine = all.filter((r) => {
    const acts = allowedReimburseActions(actor, r.userId, r.status).filter((a) => a !== "resubmit");
    return acts.length > 0;
  }).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const months = lastMonths(today);
  const data = monthlyByPayment(all, months);
  const paidSeries = { key: "paid", label: "Sudah dibayar", color: stageMeta.paid.color };
  const unpaidSeries = { key: "unpaid", label: "Belum dibayar", color: stageMeta.unpaid.color };

  return (
    <Stagger className="flex flex-col gap-4">
      <StaggerItem>
        <StatusFlow list={all} title="Reimburse perusahaan · total diajukan" />
      </StaggerItem>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel title="Perlu tindakan Anda" aside={<Link href={actor.role === "finance" ? "/reimburse-recap" : "/approvals"} className="text-xs text-fg-brand hover:underline">Buka semua</Link>}>
          <MiniList
            empty="Tidak ada reimburse yang menunggu Anda."
            items={mine.slice(0, 6).map((r) => {
              const s = stageOf(r.status);
              return {
                key: r.id,
                left: (
                  <Link href={actor.role === "finance" ? "/reimburse-recap" : "/approvals"} className="hover:text-fg-brand">
                    <span className="font-mono text-xs text-fg-subtle">{r.number}</span> {userName(r.userId)} · {formatRupiah(claimTotal(r))}
                  </Link>
                ),
                right: <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: stageMeta[s].color }} />{s === "unpaid" ? "Siap dibayar" : stageMeta[s].short}</span>,
              };
            })}
          />
        </Panel>
        <Panel title="Dibayar vs belum dibayar · 6 bulan">
          <BarChart
            height={180}
            categories={months.map((m) => formatPeriod(m).slice(0, 3))}
            yFormat={shortRp}
            series={[{ ...paidSeries, values: data.map((d) => d.paid) }, { ...unpaidSeries, values: data.map((d) => d.unpaid) }]}
          />
        </Panel>
      </div>
    </Stagger>
  );
}

/** Pegawai: ringkasan reimburse sendiri. */
export function ReimburseMineCard() {
  const { state, user } = useAuthed();
  const mine = state.reimbursements.filter((r) => r.userId === user.id);
  const t = stageTotals(mine);
  const inProcess = t.finance.amount + t.stakeholder.amount + t.revision.amount;
  const last = [...mine].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 3);
  const rows = [
    { label: "Dalam proses", amount: inProcess, color: stageMeta.finance.color },
    { label: "Siap dibayar", amount: t.unpaid.amount, color: stageMeta.unpaid.color },
    { label: "Sudah dibayar", amount: t.paid.amount, color: stageMeta.paid.color },
  ];
  return (
    <Panel title="Reimburse saya" aside={<Link href="/reimbursements" className="text-xs text-fg-brand hover:underline">Ajukan / lihat</Link>}>
      <div className="grid grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs text-fg-muted"><span className="size-2 rounded-full" style={{ background: r.color }} />{r.label}</span>
            <span className="font-mono text-sm">{formatRupiah(r.amount)}</span>
          </div>
        ))}
      </div>
      <MiniList
        empty="Belum ada pengajuan."
        items={last.map((r) => ({
          key: r.id,
          left: <><span className="font-mono text-xs text-fg-subtle">{r.number}</span> {r.title}</>,
          right: r.status === "rejected" ? <Badge tone="danger">Ditolak</Badge> : r.paidAt ? `Dibayar ${formatDate(r.paidAt)}` : stageMeta[stageOf(r.status)].short,
        }))}
      />
    </Panel>
  );
}
