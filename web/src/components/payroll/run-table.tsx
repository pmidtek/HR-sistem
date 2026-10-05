"use client";

import { Eye, Pencil } from "lucide-react";
import type { Payslip } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { useLookups } from "../hooks";
import { IconButton } from "../ui/button";
import { Icon } from "../ui/icon";
import { Table, Td, Th, Tr } from "../ui/table";

export type SlipTotals = { fixed: number; overtime: number; reimburse: number; other: number; deductions: number; thp: number };

export function slipTotals(p: Payslip): SlipTotals {
  const fixed = p.input.base + p.input.allowances.reduce((s, a) => s + a.amount, 0);
  const overtime = p.overtimeDetails.reduce((s, d) => s + d.amount, 0);
  const other = p.input.otherIncome.reduce((s, x) => s + x.amount, 0);
  const earnings = p.lines.filter((l) => l.kind === "earning").reduce((s, l) => s + l.amount, 0);
  const deductions = p.lines.filter((l) => l.kind === "deduction").reduce((s, l) => s + l.amount, 0);
  return { fixed, overtime, reimburse: p.input.reimburse, other, deductions, thp: earnings - deductions };
}

type Props = { slips: Payslip[]; editable: boolean; onView: (p: Payslip) => void; onEdit: (p: Payslip) => void };

export function RunTable({ slips, editable, onView, onEdit }: Props) {
  const { userName, user, teamName } = useLookups();
  const totals = slips.map(slipTotals).reduce<SlipTotals>(
    (a, t) => ({ fixed: a.fixed + t.fixed, overtime: a.overtime + t.overtime, reimburse: a.reimburse + t.reimburse, other: a.other + t.other, deductions: a.deductions + t.deductions, thp: a.thp + t.thp }),
    { fixed: 0, overtime: 0, reimburse: 0, other: 0, deductions: 0, thp: 0 },
  );
  const num = "text-right font-mono text-xs";

  return (
    <Table>
      <thead>
        <tr>
          <Th>Pegawai</Th>
          <Th className="text-right">Gaji + tunjangan</Th>
          <Th className="text-right">Lembur</Th>
          <Th className="text-right">Reimburse</Th>
          <Th className="text-right">Lain-lain</Th>
          <Th className="text-right">Potongan</Th>
          <Th className="text-right">Take home pay</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {slips.map((p) => {
          const t = slipTotals(p);
          const u = user(p.userId);
          return (
            <Tr key={p.id}>
              <Td>
                <p className="text-sm">{userName(p.userId)}</p>
                <p className="text-xs text-fg-subtle">{u ? teamName(u.teamId) : ""} · {p.input.ptkp}</p>
              </Td>
              <Td className={num}>{formatNumber(t.fixed)}</Td>
              <Td className={`${num} text-fg-brand`}>{t.overtime ? formatNumber(t.overtime) : "-"}</Td>
              <Td className={num}>{t.reimburse ? formatNumber(t.reimburse) : "-"}</Td>
              <Td className={num}>{t.other ? formatNumber(t.other) : "-"}</Td>
              <Td className={`${num} text-fg-danger`}>{formatNumber(t.deductions)}</Td>
              <Td className={`${num} text-sm text-fg`}>{formatNumber(t.thp)}</Td>
              <Td className="text-right whitespace-nowrap">
                {editable && (
                  <IconButton label="Input manual" size="small" onClick={() => onEdit(p)}>
                    <Icon icon={Pencil} size={14} />
                  </IconButton>
                )}
                <IconButton label="Lihat slip" size="small" onClick={() => onView(p)}>
                  <Icon icon={Eye} size={14} />
                </IconButton>
              </Td>
            </Tr>
          );
        })}
        <Tr className="bg-sunken">
          <Td className="font-medium">Total ({slips.length} pegawai)</Td>
          <Td className={num}>{formatNumber(totals.fixed)}</Td>
          <Td className={num}>{formatNumber(totals.overtime)}</Td>
          <Td className={num}>{formatNumber(totals.reimburse)}</Td>
          <Td className={num}>{formatNumber(totals.other)}</Td>
          <Td className={num}>{formatNumber(totals.deductions)}</Td>
          <Td className={`${num} text-sm`}>{formatNumber(totals.thp)}</Td>
          <Td />
        </Tr>
      </tbody>
    </Table>
  );
}
