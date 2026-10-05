"use client";

import { Lock, Trash2 } from "lucide-react";
import { useState } from "react";
import { fromMinutes } from "@/lib/calc/dates";
import { validateEntry, type EntryInput } from "@/lib/calc/timesheet";
import type { TimesheetEntry } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { deleteTimesheetEntry, saveTimesheetEntry } from "@/store/actions";
import { newId } from "@/store/state";
import { approvedLeaveDates, useLookups } from "../hooks";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox";
import { Dialog } from "../ui/dialog";
import { Input, Select, Textarea } from "../ui/form";
import { Icon } from "../ui/icon";

const TIME_OPTIONS = Array.from({ length: 24 * 4 + 1 }, (_, i) => fromMinutes(i * 15)).filter((t) => t <= "24:00");

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entri yang diedit, atau draf baru (tanpa id). */
  initial: EntryInput;
};

export function EntryDialog({ open, onOpenChange, initial }: Props) {
  const { state, user, today, run } = useAuthed();
  const { projectOptions } = useLookups();
  const [form, setForm] = useState<EntryInput>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const existing = initial.id ? state.timesheet.find((e) => e.id === initial.id) : undefined;
  const locked = existing?.locked ?? false;

  const set = <K extends keyof EntryInput>(key: K, value: EntryInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  function save() {
    const errs = validateEntry(form, {
      today,
      backdateDays: state.settings.work.timesheetBackdateDays,
      approvedLeaveDates: approvedLeaveDates(state, user.id),
      existing: state.timesheet.filter((e) => e.userId === user.id),
    });
    setErrors(errs);
    if (errs.length > 0) return;
    const entry: TimesheetEntry = { ...form, id: form.id ?? newId("ts"), userId: user.id, locked: false };
    if (run((s) => saveTimesheetEntry(s, entry), form.id ? "Entri diperbarui." : "Entri ditambahkan.")) onOpenChange(false);
  }

  function remove() {
    if (form.id && run((s) => deleteTimesheetEntry(s, form.id ?? ""), "Entri dihapus.")) onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={form.id ? "Edit entri timesheet" : "Tambah entri timesheet"}
      description="Jam dalam kelipatan 15 menit."
      footer={
        <>
          {form.id && !locked && (
            <Button variant="ghost" tone="danger" iconLeft={<Icon icon={Trash2} />} onClick={remove} className="mr-auto">
              Hapus
            </Button>
          )}
          <Button variant="secondary" tone="neutral" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          {!locked && <Button onClick={save}>Simpan</Button>}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {locked && (
          <p className="flex items-center gap-2 rounded-xs bg-warning-subtle px-3 py-2 text-xs text-warning">
            <Icon icon={Lock} size={14} /> Entri terkunci karena sudah masuk lembur yang disetujui.
          </p>
        )}
        <Input label="Tanggal" type="date" value={form.date} max={today} disabled={locked} onChange={(e) => set("date", e.target.value)} />
        <Combobox label="Kode Project" value={form.projectCode} onChange={(v) => set("projectCode", v)} options={projectOptions} placeholder="Pilih kode project" searchPlaceholder="Cari kode atau nama…" />
        <Select
          label="Activity"
          value={form.activityId}
          disabled={locked}
          onChange={(e) => set("activityId", e.target.value)}
          placeholder="Pilih activity"
          options={state.activityCodes.filter((a) => a.active).map((a) => ({ value: a.id, label: a.name }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Jam mulai" value={form.start} disabled={locked} onChange={(e) => set("start", e.target.value)} options={TIME_OPTIONS.slice(0, -1)} />
          <Select label="Jam selesai" value={form.end} disabled={locked} onChange={(e) => set("end", e.target.value)} options={TIME_OPTIONS.slice(1)} />
        </div>
        <Textarea label="Deskripsi pekerjaan" value={form.description} disabled={locked} onChange={(e) => set("description", e.target.value)} placeholder="Detail apa yang dikerjakan" />
        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-xs bg-danger-subtle px-3 py-2 text-xs text-fg-danger">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
