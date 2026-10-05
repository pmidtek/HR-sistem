"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";
import type { AppSettings } from "@/lib/settings-types";
import { useAuthed } from "@/store/app-provider";
import { saveSettings } from "@/store/actions-business";
import { Input, Select, Switch, Textarea } from "../ui/form";
import { parseRp, SettingsSection } from "./settings-section";

type FormProps = { readOnly: boolean };

function useSettingDraft<K extends keyof AppSettings>(key: K) {
  const { state, run } = useAuthed();
  const [draft, setDraft] = useState<AppSettings[K]>(state.settings[key]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings[key]);
  return {
    draft,
    setDraft,
    dirty,
    save: () => run((s) => saveSettings(s, key, draft), "Pengaturan disimpan."),
    reset: () => setDraft(state.settings[key]),
  };
}

const num = (v: string) => Number(v.replace(",", ".")) || 0;

export function WorkForm({ readOnly }: FormProps) {
  const { draft: d, setDraft, dirty, save, reset } = useSettingDraft("work");
  return (
    <SettingsSection title="Jam kerja & timesheet" description="Dipakai untuk menghitung lembur otomatis dan validasi timesheet." readOnly={readOnly} dirty={dirty} onSave={save} onReset={reset}>
      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Jam kerja normal per hari" value={String(d.normalHoursPerDay)} onChange={(e) => setDraft({ ...d, normalHoursPerDay: num(e.target.value) })} options={["7", "8"].map((v) => ({ value: v, label: `${v} jam` }))} helperText="Jam di atas batas ini dihitung lembur." />
        <Select label="Hari kerja per minggu" value={String(d.workdaysPerWeek)} onChange={(e) => setDraft({ ...d, workdaysPerWeek: e.target.value === "6" ? 6 : 5 })} options={[{ value: "5", label: "5 hari (Senin–Jumat)" }, { value: "6", label: "6 hari (Senin–Sabtu)" }]} />
        <Input label="Batas isi timesheet mundur (hari)" type="number" min={0} value={d.timesheetBackdateDays} onChange={(e) => setDraft({ ...d, timesheetBackdateDays: num(e.target.value) })} />
        <Input label="Target jam normal per bulan" type="number" min={0} value={d.monthlyTargetHours} onChange={(e) => setDraft({ ...d, monthlyTargetHours: num(e.target.value) })} />
      </div>
    </SettingsSection>
  );
}

export function OvertimeForm({ readOnly }: FormProps) {
  const { draft: d, setDraft, dirty, save, reset } = useSettingDraft("overtime");
  const field = (label: string, key: keyof typeof d) => (
    <Input label={label} inputMode="decimal" value={String(d[key]).replace(".", ",")} onChange={(e) => setDraft({ ...d, [key]: num(e.target.value) })} />
  );
  return (
    <SettingsSection title="Rumus lembur" description="Mode Depnaker: upah per jam = (gaji pokok + tunjangan tetap) ÷ pembagi. Mode Flat: tarif tetap per jam." readOnly={readOnly} dirty={dirty} onSave={save} onReset={reset}>
      <Select label="Mode lembur" value={d.mode} onChange={(e) => setDraft({ ...d, mode: e.target.value === "flat" ? "flat" : "depnaker" })} options={[{ value: "depnaker", label: "Depnaker" }, { value: "flat", label: "Flat (tarif per jam)" }]} />
      {d.mode === "depnaker" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {field("Pembagi upah per jam", "hourlyDivisor")}
          {field("Hari kerja: pengali jam ke-1", "weekdayFirstHour")}
          {field("Hari kerja: pengali jam ke-2 dst", "weekdayNextHours")}
          {field("Hari libur: pengali jam 1–8", "holidayFirst8")}
          {field("Hari libur: pengali jam ke-9", "holidayHour9")}
          {field("Hari libur: pengali jam 10–12", "holidayHour10to12")}
        </div>
      ) : (
        <Input label="Tarif flat per jam (Rp)" inputMode="numeric" value={formatNumber(d.flatRatePerHour)} onChange={(e) => setDraft({ ...d, flatRatePerHour: parseRp(e.target.value) })} />
      )}
    </SettingsSection>
  );
}

export function PayrollForm({ readOnly }: FormProps) {
  const { draft: d, setDraft, dirty, save, reset } = useSettingDraft("payroll");
  return (
    <SettingsSection title="Periode & pembayaran" description="Lembur, cuti tanpa gaji, dan reimburse diambil sesuai periode ini." readOnly={readOnly} dirty={dirty} onSave={save} onReset={reset}>
      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Periode payroll" value={d.periodMode} onChange={(e) => setDraft({ ...d, periodMode: e.target.value === "calendar" ? "calendar" : "cutoff" })} options={[{ value: "calendar", label: "Bulan kalender (tgl 1 – akhir bulan)" }, { value: "cutoff", label: "Cutoff" }]} />
        {d.periodMode === "cutoff" && (
          <Input label="Tanggal cutoff" type="number" min={1} max={28} value={d.cutoffDay} onChange={(e) => setDraft({ ...d, cutoffDay: num(e.target.value) })} helperText={`Periode: tgl ${d.cutoffDay + 1} bulan lalu s/d tgl ${d.cutoffDay} bulan ini.`} />
        )}
      </div>
      <Switch checked={d.reimburseViaPayroll} onChange={(v) => setDraft({ ...d, reimburseViaPayroll: v })} label="Reimburse yang disetujui dibayar lewat payroll" />
      <Switch checked={d.payslipPasswordProtected} onChange={(v) => setDraft({ ...d, payslipPasswordProtected: v })} label="PDF slip gaji dilindungi password (tanggal lahir DDMMYYYY)" />
    </SettingsSection>
  );
}

export function CompanyForm({ readOnly }: FormProps) {
  const { draft: d, setDraft, dirty, save, reset } = useSettingDraft("company");
  return (
    <SettingsSection title="Perusahaan" description="Ditampilkan di kop slip gaji." readOnly={readOnly} dirty={dirty} onSave={save} onReset={reset}>
      <Input label="Nama perusahaan" value={d.name} onChange={(e) => setDraft({ ...d, name: e.target.value })} />
      <Textarea label="Alamat" value={d.address} onChange={(e) => setDraft({ ...d, address: e.target.value })} />
      <Input label="Logo" type="file" accept="image/*" helperText="Upload logo akan aktif setelah backend tersambung." disabled />
    </SettingsSection>
  );
}
