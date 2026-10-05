"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatNumber } from "@/lib/format";
import type { BpjsRate, TerCategory, TerRate } from "@/lib/settings-types";
import { useAuthed } from "@/store/app-provider";
import { saveSettings } from "@/store/actions-business";
import { newId } from "@/store/state";
import { Button, IconButton } from "../ui/button";
import { Input } from "../ui/form";
import { Icon } from "../ui/icon";
import { Table, Td, Th, Tr } from "../ui/table";
import { Tabs } from "../ui/tabs";
import { bpsToPct, parseRp, pctToBps, SettingsSection } from "./settings-section";

const cell = "h-8 text-xs";

export function BpjsTable({ readOnly }: { readOnly: boolean }) {
  const { state, run } = useAuthed();
  const [rows, setRows] = useState<BpjsRate[]>(state.settings.bpjs);
  const [version, setVersion] = useState(0);
  const dirty = JSON.stringify(rows) !== JSON.stringify(state.settings.bpjs);
  const upd = (i: number, patch: Partial<BpjsRate>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <SettingsSection
      title="Tarif BPJS"
      description="Persentase dan batas upah berubah tiap tahun. Porsi perusahaan tampil di slip tapi tidak memotong gaji."
      readOnly={readOnly} dirty={dirty} onReset={() => { setRows(state.settings.bpjs); setVersion((v) => v + 1); }}
      onSave={() => run((s) => saveSettings(s, "bpjs", rows), "Tarif BPJS disimpan.")}
    >
      <Table>
        <thead><tr><Th>Program</Th><Th>Karyawan (%)</Th><Th>Perusahaan (%)</Th><Th>Batas upah (Rp, kosong = tanpa batas)</Th></tr></thead>
        <tbody key={version}>
          {rows.map((r, i) => (
            <Tr key={r.id}>
              <Td><Input size="small" className={cell} value={r.name} onChange={(e) => upd(i, { name: e.target.value })} /></Td>
              <Td><Input size="small" className={cell} inputMode="decimal" defaultValue={bpsToPct(r.employeeBps)} onBlur={(e) => upd(i, { employeeBps: pctToBps(e.target.value) })} /></Td>
              <Td><Input size="small" className={cell} inputMode="decimal" defaultValue={bpsToPct(r.employerBps)} onBlur={(e) => upd(i, { employerBps: pctToBps(e.target.value) })} /></Td>
              <Td><Input size="small" className={cell} inputMode="numeric" value={r.wageCap === null ? "" : formatNumber(r.wageCap)} onChange={(e) => upd(i, { wageCap: e.target.value.trim() ? parseRp(e.target.value) : null })} /></Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </SettingsSection>
  );
}

export function TerTable({ readOnly }: { readOnly: boolean }) {
  const { state, run } = useAuthed();
  const [rows, setRows] = useState<TerRate[]>(state.settings.ter);
  const [version, setVersion] = useState(0);
  const [cat, setCat] = useState<TerCategory>("A");
  const dirty = JSON.stringify(rows) !== JSON.stringify(state.settings.ter);
  const upd = (id: string, patch: Partial<TerRate>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const visible = rows.filter((r) => r.category === cat).sort((a, b) => a.minIncome - b.minIncome);

  return (
    <SettingsSection
      title="Tabel PPh 21 TER bulanan"
      description="PP 58/2023. Kategori A: TK/0, TK/1, K/0 · B: TK/2, TK/3, K/1, K/2 · C: K/3. Seed awal adalah contoh dan WAJIB diverifikasi Finance/konsultan pajak."
      readOnly={readOnly} dirty={dirty} onReset={() => { setRows(state.settings.ter); setVersion((v) => v + 1); }}
      onSave={() => run((s) => saveSettings(s, "ter", rows), "Tabel TER disimpan.")}
    >
      <div className="flex items-center justify-between gap-3">
        <Tabs variant="pill" value={cat} onChange={setCat} tabs={(["A", "B", "C"] as const).map((c) => ({ value: c, label: `Kategori ${c}`, count: rows.filter((r) => r.category === c).length }))} />
        {!readOnly && (
          <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setRows((r) => [...r, { id: newId(`${cat}-`), category: cat, minIncome: 0, maxIncome: null, rateBps: 0 }])}>
            Tambah baris
          </Button>
        )}
      </div>
      <Table>
        <thead><tr><Th>Bruto bulanan dari (Rp)</Th><Th>Sampai (Rp, kosong = ke atas)</Th><Th>Tarif (%)</Th><Th /></tr></thead>
        <tbody key={version}>
          {visible.map((r) => (
            <Tr key={r.id}>
              <Td><Input size="small" className={cell} inputMode="numeric" value={formatNumber(r.minIncome)} onChange={(e) => upd(r.id, { minIncome: parseRp(e.target.value) })} /></Td>
              <Td><Input size="small" className={cell} inputMode="numeric" value={r.maxIncome === null ? "" : formatNumber(r.maxIncome)} onChange={(e) => upd(r.id, { maxIncome: e.target.value.trim() ? parseRp(e.target.value) : null })} /></Td>
              <Td><Input size="small" className={cell} inputMode="decimal" defaultValue={bpsToPct(r.rateBps)} onBlur={(e) => upd(r.id, { rateBps: pctToBps(e.target.value) })} /></Td>
              <Td className="text-right">
                {!readOnly && <IconButton label="Hapus baris" size="small" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))}><Icon icon={Trash2} size={14} /></IconButton>}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </SettingsSection>
  );
}
