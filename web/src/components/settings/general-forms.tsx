"use client";

import { useState } from "react";
import { addDays, dayOfWeek } from "@/lib/calc/dates";
import { estimatedPayDate } from "@/lib/calc/reimburse";
import { formatDayShort, formatNumber } from "@/lib/format";
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
    save: () => run((s) => saveSettings(s, key, draft), "Settings saved."),
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
    <SettingsSection title="Company" description="Shown on documents and payslips." readOnly={readOnly} dirty={dirty} onSave={save} onReset={reset}>
      <Input label="Company name" value={d.name} onChange={(e) => setDraft({ ...d, name: e.target.value })} />
      <Textarea label="Address" value={d.address} onChange={(e) => setDraft({ ...d, address: e.target.value })} />
      <Input label="Logo" type="file" accept="image/*" helperText="Logo upload will be enabled once the backend is connected." disabled />
    </SettingsSection>
  );
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ReimburseForm({ readOnly }: FormProps) {
  const { state } = useAuthed();
  const { draft: d, setDraft, dirty, save, reset } = useSettingDraft("reimburse");
  const holidays = new Set(state.holidays.map((h) => h.date));
  const toggleDay = (day: number) => setDraft({ ...d, payDays: d.payDays.includes(day) ? d.payDays.filter((x) => x !== day) : [...d.payDays, day].sort() });
  // Contoh: pengajuan Senin–Minggu minggu ini → perkiraan tanggal bayar.
  const monday = "2026-10-12";
  return (
    <SettingsSection title="Reimbursement payment" description="Approved claims are paid on the next pay day at least N days after submission. Holidays are skipped." readOnly={readOnly} dirty={dirty} onSave={save} onReset={reset}>
      <div className="flex flex-col gap-2">
        <p className="text-xs text-fg-muted">Pay days</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <label key={day} className="inline-flex items-center gap-2 rounded-xxs px-2.5 py-1.5 text-sm shadow-[inset_0_0_0_1px_var(--border-default)]">
              <input type="checkbox" checked={d.payDays.includes(day)} onChange={() => toggleDay(day)} className="accent-[var(--brand)]" />
              {DAY_NAMES[day]}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Minimum days from submission to payment" type="number" min={0} max={14} value={d.leadDays} onChange={(e) => setDraft({ ...d, leadDays: num(e.target.value) })} />
        <Input label="USD exchange rate (Rp per $1)" inputMode="numeric" value={formatNumber(d.usdRate)} onChange={(e) => setDraft({ ...d, usdRate: parseRp(e.target.value) })} helperText="Pre-fills the IDR column. Employees can still change it to match their card statement." />
      </div>
      <div className="rounded-xs bg-sunken px-4 py-3 text-xs text-fg-muted">
        <p className="mb-1.5 text-fg">Preview</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {[0, 1, 2, 3, 4].map((i) => {
            const day = addDays(monday, i);
            return <li key={day}>Submitted on {DAY_NAMES[dayOfWeek(day)]} → paid {formatDayShort(estimatedPayDate(day, d, holidays))}</li>;
          })}
        </ul>
      </div>
    </SettingsSection>
  );
}
