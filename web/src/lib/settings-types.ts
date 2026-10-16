/** Pengaturan yang bisa diubah HR/Finance dari halaman Pengaturan (nanti disimpan di Directus). */

export type OvertimeMode = "depnaker" | "flat";
export type PayrollPeriodMode = "calendar" | "cutoff";

export type WorkSettings = {
  normalHoursPerDay: number;
  workdaysPerWeek: 5 | 6;
  timesheetBackdateDays: number;
  monthlyTargetHours: number;
};

export type OvertimeSettings = {
  mode: OvertimeMode;
  /** Pembagi upah per jam (Depnaker: 173). */
  hourlyDivisor: number;
  weekdayFirstHour: number;
  weekdayNextHours: number;
  holidayFirst8: number;
  holidayHour9: number;
  holidayHour10to12: number;
  flatRatePerHour: number;
};

export type PayrollSettings = {
  periodMode: PayrollPeriodMode;
  cutoffDay: number;
  reimburseViaPayroll: boolean;
  payslipPasswordProtected: boolean;
};

export type BpjsRate = {
  id: string;
  name: string;
  /** Persen dalam basis poin agar tetap integer: 1% = 100. */
  employeeBps: number;
  employerBps: number;
  /** Batas upah (Rp); null = tanpa batas. */
  wageCap: number | null;
};

export type TerCategory = "A" | "B" | "C";

export type TerRate = {
  id: string;
  category: TerCategory;
  minIncome: number;
  maxIncome: number | null;
  /** Tarif dalam basis poin: 0,25% = 25. */
  rateBps: number;
};

export type ReimburseSettings = {
  /** Kurs USD → Rupiah untuk mengisi otomatis kolom IDR di form reimburse. */
  usdRate: number;
  /** Hari bayar reimburse (0 = Minggu … 6 = Sabtu), mis. Rabu & Jumat = [3, 5]. */
  payDays: number[];
  /** Jarak minimal (hari) dari pengajuan ke hari bayar. Senin + 2 = Rabu, Rabu + 2 = Jumat. */
  leadDays: number;
  /** Struk lebih tua dari ini (hari) tidak bisa diajukan. */
  maxReceiptAgeDays: number;
  /** Bayar via transfer hanya ke rekening yang sudah diverifikasi Finance. */
  requireVerifiedAccount: boolean;
};

export type CompanySettings = {
  name: string;
  address: string;
  logoUrl: string;
};

export type AppSettings = {
  work: WorkSettings;
  overtime: OvertimeSettings;
  payroll: PayrollSettings;
  reimburse: ReimburseSettings;
  bpjs: BpjsRate[];
  ter: TerRate[];
  company: CompanySettings;
};
