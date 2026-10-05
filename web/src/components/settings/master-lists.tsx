"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatDate } from "@/lib/format";
import type { ActivityCode, Holiday, LeaveType, ReimbursementCategory, Team } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { saveMaster } from "@/store/actions-business";
import { newId, type DataState } from "@/store/state";
import { Button, IconButton } from "../ui/button";
import { Input, Select, Switch } from "../ui/form";
import { Icon } from "../ui/icon";
import { Table, Td, Th, Tr } from "../ui/table";
import { SettingsSection } from "./settings-section";

type Key = "holidays" | "activityCodes" | "leaveTypes" | "reimbursementCategories" | "teams";

type ListProps<K extends Key> = {
  storeKey: K;
  title: string;
  description?: string;
  readOnly: boolean;
  headers: string[];
  blank: () => DataState[K][number];
  renderRow: (item: DataState[K][number], update: (patch: Partial<DataState[K][number]>) => void) => ReactNode[];
};

function MasterList<K extends Key>({ storeKey, title, description, readOnly, headers, blank, renderRow }: ListProps<K>) {
  const { state, run } = useAuthed();
  type Item = DataState[K][number];
  const [rows, setRows] = useState<Item[]>(state[storeKey] as Item[]);
  const dirty = JSON.stringify(rows) !== JSON.stringify(state[storeKey]);

  return (
    <SettingsSection
      title={title} description={description} readOnly={readOnly} dirty={dirty}
      onReset={() => setRows(state[storeKey] as Item[])}
      onSave={() => run((s) => saveMaster(s, storeKey, rows as DataState[K]), `${title} disimpan.`)}
    >
      <Table>
        <thead><tr>{headers.map((h) => <Th key={h}>{h}</Th>)}<Th /></tr></thead>
        <tbody>
          {rows.map((item, i) => (
            <Tr key={i}>
              {renderRow(item, (patch) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)))).map((c, ci) => <Td key={ci}>{c}</Td>)}
              <Td className="text-right">
                {!readOnly && <IconButton label="Hapus" size="small" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}><Icon icon={Trash2} size={14} /></IconButton>}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {!readOnly && (
        <div>
          <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setRows((r) => [...r, blank()])}>Tambah</Button>
        </div>
      )}
    </SettingsSection>
  );
}

const sm = "h-8 text-xs";

export function HolidayList({ readOnly }: { readOnly: boolean }) {
  return (
    <MasterList<"holidays"> storeKey="holidays" title="Kalender libur" description="Libur nasional tidak dihitung sebagai hari kerja (cuti & payroll) dan kerja di hari ini dihitung lembur hari libur." readOnly={readOnly}
      headers={["Tanggal", "Nama libur"]} blank={(): Holiday => ({ date: "", name: "" })}
      renderRow={(h, up) => [
        <Input key="d" size="small" className={sm} type="date" value={h.date} onChange={(e) => up({ date: e.target.value })} title={h.date ? formatDate(h.date) : ""} />,
        <Input key="n" size="small" className={sm} value={h.name} onChange={(e) => up({ name: e.target.value })} />,
      ]} />
  );
}

export function ActivityList({ readOnly }: { readOnly: boolean }) {
  return (
    <MasterList<"activityCodes"> storeKey="activityCodes" title="Activity code" description="Pilihan activity di timesheet." readOnly={readOnly}
      headers={["Nama", "Aktif"]} blank={(): ActivityCode => ({ id: newId("act"), name: "", active: true })}
      renderRow={(a, up) => [
        <Input key="n" size="small" className={sm} value={a.name} onChange={(e) => up({ name: e.target.value })} />,
        <Switch key="a" checked={a.active} onChange={(v) => up({ active: v })} />,
      ]} />
  );
}

export function CategoryList({ readOnly }: { readOnly: boolean }) {
  return (
    <MasterList<"reimbursementCategories"> storeKey="reimbursementCategories" title="Kategori reimburse" readOnly={readOnly}
      headers={["Nama kategori"]} blank={(): ReimbursementCategory => ({ id: newId("cat"), name: "" })}
      renderRow={(c, up) => [<Input key="n" size="small" className={sm} value={c.name} onChange={(e) => up({ name: e.target.value })} />]} />
  );
}

export function TeamList({ readOnly }: { readOnly: boolean }) {
  return (
    <MasterList<"teams"> storeKey="teams" title="Tim" description="Tim Sales mengakses Sales Pipeline; tim delivery mengakses Project Board." readOnly={readOnly}
      headers={["Nama tim", "Jenis"]} blank={(): Team => ({ id: newId("t"), name: "", kind: "delivery" })}
      renderRow={(t, up) => [
        <Input key="n" size="small" className={sm} value={t.name} onChange={(e) => up({ name: e.target.value })} />,
        <Select key="k" className={sm} value={t.kind} onChange={(e) => up({ kind: e.target.value as Team["kind"] })} options={[{ value: "sales", label: "Sales" }, { value: "delivery", label: "Delivery" }, { value: "support", label: "Pendukung" }]} />,
      ]} />
  );
}

export function LeaveTypeList({ readOnly }: { readOnly: boolean }) {
  return (
    <MasterList<"leaveTypes"> storeKey="leaveTypes" title="Jenis cuti" description="Kuota kosong = tanpa batas. Saldo tidak boleh minus." readOnly={readOnly}
      headers={["Nama", "Kuota/tahun", "Potong saldo", "Potong gaji", "Lampiran jika > (hari)"]}
      blank={(): LeaveType => ({ id: newId("lt"), name: "", quotaDays: null, deductsBalance: false, unpaid: false, attachmentAfterDays: null })}
      renderRow={(t, up) => [
        <Input key="n" size="small" className={sm} value={t.name} onChange={(e) => up({ name: e.target.value })} />,
        <Input key="q" size="small" className={sm} type="number" min={0} value={t.quotaDays ?? ""} onChange={(e) => up({ quotaDays: e.target.value ? Number(e.target.value) : null })} />,
        <Switch key="d" checked={t.deductsBalance} onChange={(v) => up({ deductsBalance: v })} />,
        <Switch key="u" checked={t.unpaid} onChange={(v) => up({ unpaid: v })} />,
        <Input key="a" size="small" className={sm} type="number" min={0} value={t.attachmentAfterDays ?? ""} onChange={(e) => up({ attachmentAfterDays: e.target.value ? Number(e.target.value) : null })} />,
      ]} />
  );
}
