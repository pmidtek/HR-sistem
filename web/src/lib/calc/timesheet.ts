import { diffDays, isQuarterHour, toMinutes } from "./dates";

export type EntryInput = {
  id?: string;
  date: string;
  start: string;
  end: string;
  projectCode: string;
  activityId: string;
  description: string;
};

export type ExistingEntry = { id: string; date: string; start: string; end: string };

export type ValidationContext = {
  today: string;
  backdateDays: number;
  approvedLeaveDates: Set<string>;
  existing: ExistingEntry[];
};

/** Validasi satu entri timesheet. Mengembalikan daftar pesan error (kosong = valid). */
export function validateEntry(entry: EntryInput, ctx: ValidationContext): string[] {
  const errors: string[] = [];

  if (!entry.date) errors.push("Tanggal wajib diisi.");
  if (!entry.projectCode) errors.push("Kode project wajib dipilih.");
  if (!entry.activityId) errors.push("Activity wajib dipilih.");
  if (!entry.description.trim()) errors.push("Deskripsi pekerjaan wajib diisi.");

  if (!isQuarterHour(entry.start) || !isQuarterHour(entry.end)) {
    errors.push("Jam harus kelipatan 15 menit.");
  } else if (toMinutes(entry.end) <= toMinutes(entry.start)) {
    errors.push("Jam selesai harus setelah jam mulai.");
  }

  if (entry.date) {
    if (entry.date > ctx.today) errors.push("Tidak bisa mengisi timesheet untuk tanggal yang akan datang.");
    else if (diffDays(entry.date, ctx.today) > ctx.backdateDays) {
      errors.push(`Timesheet hanya bisa diisi maksimal ${ctx.backdateDays} hari ke belakang.`);
    }
    if (ctx.approvedLeaveDates.has(entry.date)) errors.push("Tanggal ini adalah hari cuti yang sudah disetujui.");
  }

  if (errors.length === 0 && overlaps(entry, ctx.existing)) {
    errors.push("Jam bertabrakan dengan entri lain di hari yang sama.");
  }

  return errors;
}

export function overlaps(entry: Pick<EntryInput, "id" | "date" | "start" | "end">, existing: ExistingEntry[]): boolean {
  const s = toMinutes(entry.start);
  const e = toMinutes(entry.end);
  return existing.some(
    (x) => x.id !== entry.id && x.date === entry.date && s < toMinutes(x.end) && toMinutes(x.start) < e,
  );
}

export function entryMinutes(entry: { start: string; end: string }): number {
  return toMinutes(entry.end) - toMinutes(entry.start);
}
