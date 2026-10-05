"use client";

import { formatDate, formatNumber, formatPeriod, formatRupiah, terbilang } from "@/lib/format";
import { salaryProfiles } from "@/lib/mock/payroll";
import type { PayrollRun, Payslip, PayslipLine } from "@/lib/types";
import { useApp } from "@/store/app-provider";
import { useLookups } from "../hooks";

/** Slip gaji A4 sesuai template BRIEF.md Bagian 7. Baris bernilai 0 disembunyikan kecuali komponen wajib. */
export function PayslipView({ slip, run }: { slip: Payslip; run: PayrollRun }) {
  const { state } = useApp();
  const { user, teamName, userName } = useLookups();
  const emp = user(slip.userId);
  const profile = salaryProfiles[slip.userId];
  const visible = (l: PayslipLine) => l.amount !== 0 || l.mandatory;
  const earnings = slip.lines.filter((l) => l.kind === "earning");
  const deductions = slip.lines.filter((l) => l.kind === "deduction");
  const totalE = earnings.reduce((s, l) => s + l.amount, 0);
  const totalD = deductions.reduce((s, l) => s + l.amount, 0);
  const thp = totalE - totalD;
  const company = state.settings.company;
  const employerInfo = state.settings.bpjs
    .filter((b) => b.employerBps > 0)
    .map((b) => `${b.name.replace("BPJS ", "")} ${(b.employerBps / 100).toLocaleString("id-ID")}%`)
    .join(" · ");

  return (
    <div className="payslip relative mx-auto aspect-[210/297] w-full max-w-[794px] overflow-hidden bg-white p-[6%] font-sans text-[11px] leading-snug text-[#161414] shadow-lg print:shadow-none">
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[120px] font-bold tracking-[0.1em] text-[#161414]/[0.035] select-none [transform:rotate(-30deg)]">
        RAHASIA
      </span>
      <div className="relative flex items-start justify-between border-b-2 border-[#161414] pb-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[6px] bg-[#F36A1D] font-display text-lg font-bold text-white">H</span>
          <div>
            <p className="font-display text-sm font-bold">{company.name}</p>
            <p className="text-[10px] text-[#66615D]">{company.address}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-base font-bold tracking-[0.04em]">SLIP GAJI</p>
          <p>Periode: {formatPeriod(run.period)}</p>
          <p className="text-[10px] text-[#66615D]">{formatDate(run.periodStart)} – {formatDate(run.periodEnd)}</p>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-x-8 gap-y-1 border-b border-[#E4E1DE] py-3">
        {[
          ["Nama", emp?.name], ["No. Slip", slip.number],
          ["ID Pegawai", emp?.employeeCode], ["Tim", emp ? teamName(emp.teamId) : "-"],
          ["Jabatan", emp?.position], ["Status PTKP", profile?.ptkp],
          ["NPWP", profile?.npwp || "-"], ["Rekening", profile?.bank],
        ].map(([k, v]) => (
          <p key={k} className="flex"><span className="w-24 shrink-0 text-[#66615D]">{k}</span>: {v}</p>
        ))}
      </div>

      <div className="relative grid grid-cols-2 border-b border-[#E4E1DE]">
        {[["PENDAPATAN", earnings, totalE, "Total Pendapatan"], ["POTONGAN", deductions, totalD, "Total Potongan"]].map(([title, lines, total, label], i) => (
          <div key={String(title)} className={i === 0 ? "border-r border-[#E4E1DE] pr-4" : "pl-4"}>
            <p className="py-2 font-display text-[10px] font-bold tracking-[0.08em]">{String(title)}</p>
            {(lines as PayslipLine[]).filter(visible).map((l) => (
              <p key={l.label} className="flex justify-between py-0.5"><span>{l.label}</span><span className="font-mono">{formatNumber(l.amount)}</span></p>
            ))}
            <p className="mt-2 flex justify-between border-t border-[#E4E1DE] py-2 font-bold"><span>{String(label)}</span><span className="font-mono">{formatNumber(Number(total))}</span></p>
          </div>
        ))}
      </div>

      <div className="relative border-b border-[#E4E1DE] py-4 text-center">
        <p className="text-[10px] tracking-[0.08em] text-[#66615D]">TAKE HOME PAY</p>
        <p className="font-serif text-3xl">{formatRupiah(thp)}</p>
        <p className="text-[10px] text-[#66615D] italic">({terbilang(thp)} rupiah)</p>
      </div>

      {slip.overtimeDetails.length > 0 && (
        <div className="relative border-b border-[#E4E1DE] py-3">
          <p className="mb-1 font-display text-[10px] font-bold tracking-[0.08em]">RINCIAN LEMBUR</p>
          <div className="grid grid-cols-4 text-[10px] text-[#66615D]"><span>Tanggal</span><span>Jam</span><span>Pengali</span><span className="text-right">Nominal</span></div>
          {slip.overtimeDetails.map((o) => (
            <div key={o.date} className="grid grid-cols-4"><span>{formatDate(o.date)}</span><span>{o.hours}</span><span>{o.multiplier}</span><span className="text-right font-mono">{formatNumber(o.amount)}</span></div>
          ))}
        </div>
      )}

      <div className="relative border-b border-[#E4E1DE] py-3 text-[10px] text-[#66615D]">
        <p className="font-bold text-[#161414]">Informasi (tidak memotong gaji):</p>
        <p>Porsi perusahaan: {employerInfo}</p>
      </div>

      <div className="relative pt-3 text-[10px] text-[#66615D]">
        <p>Disetujui oleh: <span className="text-[#161414]">{userName(run.approvedBy)}</span>{run.approvedAt && `, ${formatDate(run.approvedAt)}`}</p>
        <p>Dokumen ini dibuat otomatis oleh sistem dan sah tanpa tanda tangan basah.</p>
      </div>
    </div>
  );
}
