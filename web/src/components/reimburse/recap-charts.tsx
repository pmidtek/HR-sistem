"use client";

import { claimTotal, stageOf, sumItemsBy } from "@/lib/calc/reimburse";
import { formatPeriod, formatRupiah } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { BarChart } from "../charts/bar-chart";
import { ChartCard } from "../charts/chart-card";
import { BarList, Panel } from "../dashboard/widgets";
import { Stagger } from "../ui/motion";
import { stageMeta } from "./parts";

const PAID = { key: "paid", label: "Sudah dibayar", color: stageMeta.paid.color };
const UNPAID = { key: "unpaid", label: "Belum dibayar", color: stageMeta.unpaid.color };
const PROCESS = { key: "process", label: "Dalam proses", color: stageMeta.finance.color };

export const shortRp = (v: number) => (v >= 1_000_000 ? `${Math.round(v / 100_000) / 10} jt` : v >= 1000 ? `${Math.round(v / 1000)} rb` : String(v));

/** N bulan terakhir (YYYY-MM) sampai bulan `today`. */
export function lastMonths(today: string, n = 6): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1)).toISOString().slice(0, 7));
}

/** Nominal per bulan pengajuan, dipecah per status pembayaran. */
export function monthlyByPayment(list: Reimbursement[], months: string[]) {
  const pick = (m: string, f: (r: Reimbursement) => boolean) => list.filter((r) => r.submittedAt.startsWith(m) && f(r)).reduce((s, r) => s + claimTotal(r), 0);
  return months.map((m) => ({
    month: m,
    paid: pick(m, (r) => r.status === "paid"),
    unpaid: pick(m, (r) => r.status === "approved"),
    process: pick(m, (r) => ["finance", "stakeholder", "revision"].includes(stageOf(r.status))),
  }));
}

export function RecapCharts({ list, today, categoryName }: { list: Reimbursement[]; today: string; categoryName: (id: string) => string }) {
  const data = monthlyByPayment(list, lastMonths(today));
  const byCat = [...sumItemsBy(list, (i) => i.categoryId).entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 8);
  const byProject = [...sumItemsBy(list, (i) => i.projectCode ?? "Tanpa kode").entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 8);

  return (
    <div className="mb-8 flex flex-col gap-4">
      <ChartCard
        title="Reimburse per bulan"
        subtitle="Berdasarkan bulan pengajuan, 6 bulan terakhir"
        series={[PAID, UNPAID, PROCESS]}
        table={{ head: ["Bulan", "Sudah dibayar", "Belum dibayar", "Dalam proses"], rows: data.map((d) => [formatPeriod(d.month), formatRupiah(d.paid), formatRupiah(d.unpaid), formatRupiah(d.process)]) }}
      >
        <BarChart
          categories={data.map((d) => formatPeriod(d.month).slice(0, 3))}
          yFormat={shortRp}
          series={[{ ...PAID, values: data.map((d) => d.paid) }, { ...UNPAID, values: data.map((d) => d.unpaid) }, { ...PROCESS, values: data.map((d) => d.process) }]}
        />
      </ChartCard>
      <Stagger className="grid gap-4 lg:grid-cols-2">
        <Panel title="Per kategori" aside={<span className="text-xs text-fg-subtle">baris yang diganti</span>}>
          <BarList format={formatRupiah} rows={byCat.map(([id, t]) => ({ label: categoryName(id), value: t.amount }))} />
        </Panel>
        <Panel title="Per kode project" aside={<span className="text-xs text-fg-subtle">baris yang diganti</span>}>
          <BarList format={formatRupiah} rows={byProject.map(([code, t]) => ({ label: code === "OTHERS" ? "Others" : code, value: t.amount }))} />
        </Panel>
      </Stagger>
    </div>
  );
}
