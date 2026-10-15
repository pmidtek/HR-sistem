"use client";

import { Download, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { allowedReimburseActions } from "@/lib/calc/approval";
import { claimTotal, recapBy, stageOf, type Stage } from "@/lib/calc/reimburse";
import { cn } from "@/lib/cn";
import { formatPeriod, formatRupiah } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { useLookups } from "@/components/hooks";
import { ClaimDetail } from "@/components/reimburse/claim-detail";
import { ClaimTable } from "@/components/reimburse/claim-table";
import { exportReimburseCsv } from "@/components/reimburse/export";
import { stageMeta } from "@/components/reimburse/parts";
import { PayDialog } from "@/components/reimburse/pay-dialog";
import { RecapCharts } from "@/components/reimburse/recap-charts";
import { StatusFlow } from "@/components/reimburse/status-flow";
import { PageHeader, SectionTitle } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export default function ReimburseRecapPage() {
  const { state, actor, today } = useAuthed();
  const { userName, teamName } = useLookups();
  const categoryName = (id: string) => state.reimbursementCategories.find((c) => c.id === id)?.name ?? id;
  const months = [...new Set(state.reimbursements.map((r) => r.submittedAt.slice(0, 7)))].sort().reverse();
  const [month, setMonth] = useState("");
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
  const inPeriod = base.filter((r) => !month || r.submittedAt.startsWith(month));
  const list = (stage ? inPeriod.filter((r) => stageOf(r.status) === stage) : inPeriod).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const payable = new Set(list.filter((r) => allowedReimburseActions(actor, r.userId, r.status).includes("mark_paid")).map((r) => r.id));
  const selected = [...picked].filter((id) => payable.has(id));
  const selectedTotal = state.reimbursements.filter((r) => selected.includes(r.id)).reduce((s, r) => s + claimTotal(r), 0);
  const byUser = [...recapBy(inPeriod, (r) => r.userId).entries()].sort((a, b) => b[1].total - a[1].total);
  const open = openId ? state.reimbursements.find((r) => r.id === openId) : undefined;
  const userOptions = [{ value: "", label: "Semua pegawai" }, ...state.users.map((u) => ({ value: u.id, label: u.name, hint: teamName(u.teamId) }))];

  return (
    <>
      <PageHeader title="Rekap" accent="reimburse." description="Pantau alur dari review sampai dibayar. Klik tahap untuk menyaring, klik pengajuan untuk detail." />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="Periode pengajuan" value={month} placeholder="Semua periode" onChange={(e) => setMonth(e.target.value)} options={months.map((m) => ({ value: m, label: formatPeriod(m) }))} />
        <Combobox label="Pegawai" value={userId} onChange={setUserId} options={userOptions} />
        <Select label="Kategori" value={categoryId} placeholder="Semua kategori" onChange={(e) => setCategoryId(e.target.value)} options={state.reimbursementCategories.map((c) => ({ value: c.id, label: c.name }))} />
      </div>

      <div className="mb-8">
        <StatusFlow list={inPeriod} selected={stage} onSelect={setStage} title={month ? `Total diajukan · ${formatPeriod(month)}` : "Total diajukan"} />
      </div>

      <RecapCharts list={base} today={today} categoryName={categoryName} />

      <div className="mb-8">
        <SectionTitle>Per pegawai</SectionTitle>
        <Table>
          <thead>
            <tr>
              <Th>Pegawai</Th><Th className="text-right">Pengajuan</Th><Th className="text-right">Diajukan</Th><Th className="text-right">Dalam proses</Th>
              <Th className="text-right">Belum dibayar</Th><Th className="text-right">Sudah dibayar</Th><Th className="text-right">Ditolak</Th>
            </tr>
          </thead>
          <tbody>
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
        <p className="mt-2 text-xs text-fg-subtle">Klik nama pegawai untuk menyaring.</p>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionTitle>{stage ? `Pengajuan · ${stageMeta[stage].label}` : "Semua pengajuan"} ({list.length})</SectionTitle>
          {stage && <button type="button" onClick={() => setStage(null)} className="text-xs text-fg-brand hover:underline">Tampilkan semua</button>}
        </div>
        <div className="flex gap-2">
          {actor.role === "finance" && (
            <Button size="small" disabled={selected.length === 0} iconLeft={<Icon icon={Wallet} size={14} />} onClick={() => setPaying(selected)}>
              Bayar{selected.length > 0 ? ` ${selected.length} pengajuan · ${formatRupiah(selectedTotal)}` : ""}
            </Button>
          )}
          <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Download} size={14} />} disabled={list.length === 0} onClick={() => exportReimburseCsv(list, userName, categoryName, `rekap-reimburse-${today}.csv`)}>
            Ekspor Excel
          </Button>
        </div>
      </div>
      <ClaimTable list={list} onOpen={setOpenId} showOwner selection={actor.role === "finance" ? { selectable: payable, picked, onChange: setPicked } : undefined} empty="Tidak ada pengajuan" />

      {open && <ClaimDetail claim={open} onClose={() => setOpenId(null)} onPay={(ids) => setPaying(ids)} />}
      {paying && <PayDialog ids={paying} onClose={() => setPaying(null)} onDone={() => setPicked(new Set())} />}
    </>
  );
}
