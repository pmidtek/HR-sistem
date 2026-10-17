"use client";

import { ChevronLeft, Download } from "lucide-react";
import { useState } from "react";
import { activeItems, claimMonth, recapTotals, reimbursed, sumItemsBy } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { formatDate, formatPeriod, formatRupiah } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { useApp } from "@/store/app-provider";
import { useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Sheet } from "../ui/sheet";
import { Table, Td, Th, Tr } from "../ui/table";
import { ClaimTable } from "./claim-table";
import { exportReimburseCsv } from "./export";
import { monthsLabel, shortMonth } from "./monthly-recap";
import { formatUsd, ProjectCode } from "./parts";
import { Block, Breakdown, MonthChip, Tile } from "./recap-bits";

type SheetProps = {
  userId: string;
  /** Semua pengajuan (sudah difilter halaman); disaring lagi per pegawai & bulan di sini. */
  list: Reimbursement[];
  months: string[];
  month: string | null;
  onMonth: (m: string | null) => void;
  onOpenClaim: (id: string) => void;
  onClose: () => void;
  /** Kembali ke rincian bulan (jika dibuka dari sana). */
  onBack?: () => void;
};

/** Rincian satu pegawai: ringkasan, per bulan, per kategori, per kode project, semua pengajuan & baris. */
export function EmployeeRecapSheet({ userId, list, months, month, onMonth, onOpenClaim, onClose, onBack }: SheetProps) {
  const { state, today } = useApp();
  const { userName, teamName } = useLookups();
  const [showItems, setShowItems] = useState(false);
  const user = state.users.find((u) => u.id === userId);
  const categoryName = (id: string) => state.reimbursementCategories.find((c) => c.id === id)?.name ?? id;
  const mine = list.filter((r) => r.userId === userId && months.includes(claimMonth(r)));
  const shown = (month ? mine.filter((r) => claimMonth(r) === month) : mine).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const t = recapTotals(shown);
  const total = reimbursed(t);
  const byCat = [...sumItemsBy(shown, (i) => i.categoryId).entries()].sort((a, b) => b[1].amount - a[1].amount);
  const byCode = [...sumItemsBy(shown, (i) => i.projectCode ?? "").entries()].sort((a, b) => b[1].amount - a[1].amount);
  const items = shown.flatMap((r) => r.items.map((i) => ({ r, i }))).sort((a, b) => b.i.date.localeCompare(a.i.date));
  const usd = shown.flatMap((r) => (r.status === "rejected" ? [] : activeItems(r))).reduce((s, i) => s + (i.amountUsdCents ?? 0), 0);
  const name = userName(userId);
  const label = month ? formatPeriod(month) : monthsLabel(months);

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Reimbursement recap: ${name}`}
      header={
        <div>
          {onBack && (
            <button type="button" onClick={onBack} className="mb-1 inline-flex items-center gap-1 text-xs text-fg-brand hover:underline">
              <Icon icon={ChevronLeft} size={14} /> {label}
            </button>
          )}
          <p className="font-display text-base font-medium">{name}</p>
          <p className="text-xs text-fg-subtle">{teamName(user?.teamId ?? "")}{user?.role === "external" ? " · External" : ""} · {label}</p>
        </div>
      }
      footer={
        <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Download} size={14} />} disabled={shown.length === 0}
          onClick={() => exportReimburseCsv(shown, userName, categoryName, `reimbursement-${name.toLowerCase().replace(/\s+/g, "-")}-${month ?? today}.csv`)}>
          Export to Excel
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {months.length > 1 && <div className="flex flex-wrap gap-1.5">
          <MonthChip active={month === null} onClick={() => onMonth(null)}>All · {monthsLabel(months)}</MonthChip>
          {months.filter((m) => mine.some((r) => claimMonth(r) === m)).map((m) => (
            <MonthChip key={m} active={month === m} onClick={() => onMonth(m)}>{shortMonth(m)}</MonthChip>
          ))}
        </div>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="Reimbursed" value={formatRupiah(total)} sub={`${t.count} claim(s)${usd > 0 ? ` · incl. ${formatUsd(usd)}` : ""}`} strong />
          <Tile label="Paid" value={formatRupiah(t.paid)} tone="success" />
          <Tile label="Not paid yet" value={formatRupiah(t.unpaid)} tone={t.unpaid > 0 ? "warning" : undefined} />
          <Tile label="In review" value={formatRupiah(t.inProcess)} />
          <Tile label="Submitted" value={formatRupiah(t.total)} />
          <Tile label="Declined" value={formatRupiah(t.declined)} tone={t.declined > 0 ? "danger" : undefined} />
        </div>

        {month === null && (
          <Block title="By month">
            <Table>
              <thead><tr><Th>Month</Th><Th className="text-right">Claims</Th><Th className="text-right">Reimbursed</Th><Th className="text-right">Paid</Th><Th className="text-right">Not paid</Th><Th className="text-right">Declined</Th></tr></thead>
              <tbody>
                {months.map((m) => {
                  const mt = recapTotals(mine.filter((r) => claimMonth(r) === m));
                  if (mt.count === 0) return null;
                  return (
                    <Tr key={m} className="cursor-pointer" onClick={() => onMonth(m)}>
                      <Td className="text-sm">{formatPeriod(m)}</Td>
                      <Td className="text-right font-mono text-xs">{mt.count}</Td>
                      <Td className="text-right font-mono text-xs">{formatRupiah(reimbursed(mt))}</Td>
                      <Td className="text-right font-mono text-xs text-fg-success">{formatRupiah(mt.paid)}</Td>
                      <Td className={cn("text-right font-mono text-xs", mt.unpaid > 0 && "text-warning")}>{formatRupiah(mt.unpaid)}</Td>
                      <Td className={cn("text-right font-mono text-xs", mt.declined > 0 && "text-fg-danger")}>{formatRupiah(mt.declined)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Block>
        )}

        <Block title="By category">
          <Breakdown rows={byCat.map(([id, v]) => ({ key: id, label: categoryName(id), ...v }))} total={total} />
        </Block>

        <Block title="By project code">
          <Breakdown rows={byCode.map(([code, v]) => ({ key: code || "none", label: <ProjectCode code={code || null} />, ...v }))} total={total} />
        </Block>

        <Block title="Claims" aside={<span className="text-xs text-fg-subtle">click for details</span>}>
          <ClaimTable list={shown} onOpen={onOpenClaim} empty="No claims" />
        </Block>

        <Block title={`All rows (${items.length})`} aside={<button type="button" onClick={() => setShowItems(!showItems)} className="text-xs text-fg-brand hover:underline">{showItems ? "Hide" : "Show"}</button>}>
          {showItems && (
            <Table>
              <thead><tr><Th>Date</Th><Th>Description</Th><Th>Category</Th><Th>Code</Th><Th className="text-right">Cost (IDR)</Th><Th>Claim</Th></tr></thead>
              <tbody>
                {items.map(({ r, i }) => {
                  const out = r.status === "rejected" || i.declined !== null;
                  return (
                    <Tr key={i.id} className="cursor-pointer" onClick={() => onOpenClaim(r.id)}>
                      <Td className="font-mono text-xs whitespace-nowrap">{formatDate(i.date)}</Td>
                      <Td className={cn("text-sm", out && "text-fg-muted line-through")} title={i.declined?.note}>{i.description}</Td>
                      <Td className="text-xs whitespace-nowrap">{categoryName(i.categoryId)}</Td>
                      <Td><ProjectCode code={i.projectCode} /></Td>
                      <Td className={cn("text-right font-mono text-xs whitespace-nowrap", out && "text-fg-muted line-through")}>{formatRupiah(i.amount)}</Td>
                      <Td className="font-mono text-xs whitespace-nowrap text-fg-subtle">{r.number}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Block>
      </div>
    </Sheet>
  );
}
