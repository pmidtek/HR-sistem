/**
 * Tipe domain. Nama mengikuti koleksi Directus yang direncanakan di BRIEF.md Bagian 13.
 * Tanggal: string "YYYY-MM-DD" (Asia/Jakarta). Jam: "HH:MM". Uang: integer Rupiah.
 */

import type { PayrollInput } from "./calc/payroll";
import type { ClientContactRole, ProjectLabel, ProjectMember } from "./project-types";

/** "external" = freelance/vendor: hanya bisa mengajukan reimburse, wajib punya PIC internal. */
export type Role = "stakeholder" | "hr" | "finance" | "employee" | "external";

export type TeamKind = "sales" | "delivery" | "support";
export type Team = { id: string; name: string; kind: TeamKind };

export type User = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: Role;
  teamId: string;
  position: string;
  joinDate: string;
  active: boolean;
  /** Rekening tujuan pembayaran reimburse. Nomor rekening hanya terlihat utuh oleh pemilik & Finance. */
  bankAccount?: BankAccount | null;
  /** Khusus role "external". */
  external?: ExternalInfo | null;
};

export type BankAccount = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  /** Rekening baru/berubah wajib diverifikasi Finance sebelum bisa dibayar via transfer. */
  verified: boolean;
  verifiedBy: string | null;
  updatedAt: string;
};

export type ExternalInfo = {
  /** Perusahaan/vendor asal (boleh kosong untuk freelance perorangan). */
  company: string;
  /** PIC internal yang mengonfirmasi setiap pengajuan. */
  sponsorId: string;
  /** Akses berakhir setelah tanggal ini (mis. akhir kontrak). */
  accessUntil: string;
};

export type Holiday = { date: string; name: string };
export type ActivityCode = { id: string; name: string; active: boolean };

export type ProjectRefKind = "opportunity" | "project" | "internal";
export type ProjectRef = { code: string; name: string; kind: ProjectRefKind };

export type TimesheetEntry = {
  id: string;
  userId: string;
  date: string;
  projectCode: string;
  activityId: string;
  start: string;
  end: string;
  description: string;
  locked: boolean;
};

/** Status cuti & lembur. */
export type ApprovalStatus = "pending_hr" | "pending_stakeholder" | "approved" | "rejected" | "cancelled";

export type ApprovalLog = {
  at: string;
  byUserId: string;
  from: string | null;
  to: string;
  note?: string;
};

export type LeaveType = {
  id: string;
  name: string;
  /** Kuota hari kerja per tahun; null = tanpa batas. */
  quotaDays: number | null;
  deductsBalance: boolean;
  unpaid: boolean;
  /** Wajib lampiran jika lebih dari N hari (contoh: sakit > 1 hari). */
  attachmentAfterDays: number | null;
};

export type LeaveBalance = { userId: string; leaveTypeId: string; year: number; quota: number; used: number };

export type LeaveRequest = {
  id: string;
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string;
  status: ApprovalStatus;
  logs: ApprovalLog[];
};

export type OvertimeRequest = {
  id: string;
  userId: string;
  date: string;
  isHoliday: boolean;
  requestedMinutes: number;
  approvedMinutes: number | null;
  reason: string;
  status: ApprovalStatus;
  logs: ApprovalLog[];
};

export type ReimbursementStatus =
  /** Khusus pengajuan external: menunggu konfirmasi PIC internal. */
  | "pending_sponsor"
  | "pending_finance"
  | "revision"
  | "pending_stakeholder"
  | "approved"
  | "rejected"
  | "paid";

/** `limitPerItem` = batas wajar per baris (Rp); di atasnya ditandai untuk ditinjau. null = tanpa batas. */
/** `active` = false → kategori lama yang sudah tidak dipakai (tetap ada untuk nama di klaim lama). */
export type ReimbursementCategory = { id: string; name: string; limitPerItem?: number | null; active?: boolean };

/** File lampiran (struk, invoice, bukti transfer). `url` dipakai untuk membuka file; null jika tidak tersedia. */
/** `hash` = sidik jari isi file (SHA-256) untuk mendeteksi struk yang sama dipakai dua kali. */
/** `id` = id file di backend (Directus); kosong untuk data dummy. */
export type FileRef = { id?: string; name: string; url: string | null; hash?: string };

/** Satu baris di pengajuan reimburse (satu transaksi). */
export type ReimbursementItem = {
  id: string;
  date: string;
  description: string;
  categoryId: string;
  /** Kode project bebas; "OTHERS" atau null (belum diisi) juga boleh. */
  projectCode: string | null;
  /** Biaya asli dalam USD, integer sen ($22.00 = 2200). null jika transaksi Rupiah. */
  amountUsdCents: number | null;
  /** Biaya dalam Rupiah (yang diganti ke pegawai). */
  amount: number;
  files: FileRef[];
  /** Diisi jika baris ini ditolak saat review (baris lain tetap jalan). */
  declined: { note: string; byUserId: string } | null;
};

export type ReimbursePayment = {
  date: string;
  method: "transfer" | "payroll";
  reference: string;
  /** Bukti pembayaran (mis. screenshot transfer) yang di-upload pembayar. Wajib, supaya tidak ada miskom. */
  proofFiles: FileRef[];
  /** Rekening tujuan saat dibayar (dicatat permanen, supaya perubahan rekening setelahnya tidak mengubah riwayat). */
  toAccount: Pick<BankAccount, "bankName" | "accountNumber" | "accountHolder"> | null;
  byUserId: string;
};

/** Satu pengajuan reimburse = satu grup baris; disetujui dan dibayar sekaligus. */
export type Reimbursement = {
  id: string;
  /** Nomor tampilan, mis. RB-2610-003. */
  number: string;
  userId: string;
  title: string;
  submittedAt: string;
  items: ReimbursementItem[];
  status: ReimbursementStatus;
  paidAt: string | null;
  payment: ReimbursePayment | null;
  logs: ApprovalLog[];
};

export type PayrollRunStatus = "draft" | "pending" | "returned" | "approved" | "transferred";

export type PayslipLine = { label: string; amount: number; kind: "earning" | "deduction"; mandatory?: boolean };

export type Payslip = {
  id: string;
  number: string;
  runId: string;
  userId: string;
  /** Input perhitungan (termasuk input manual Finance) supaya slip bisa dihitung ulang saat draf. */
  input: PayrollInput;
  lines: PayslipLine[];
  overtimeDetails: { date: string; hours: number; multiplier: string; amount: number }[];
};

export type PayrollRun = {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollRunStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  logs: ApprovalLog[];
};

export type CompanyContact = { id: string; name: string; title: string; email: string; phone: string };

export type Company = {
  id: string;
  name: string;
  industry: string;
  website: string;
  contacts: CompanyContact[];
};

export type OpportunityStage = "lead" | "qualification" | "proposal" | "negotiation" | "won" | "lost";

export type Opportunity = {
  id: string;
  code: string;
  name: string;
  companyId: string;
  ownerId: string;
  value: number;
  stage: OpportunityStage;
  probability: number;
  expectedClose: string;
  lostReason: string | null;
};

export type ProjectStatus = "not_started" | "ongoing" | "review" | "done" | "on_hold" | "cancelled";

export type Project = {
  id: string;
  code: string;
  name: string;
  opportunityId: string | null;
  /** Klien (company) project; null = project internal. */
  companyId: string | null;
  teamIds: string[];
  /** Lead utama (ditampilkan di header). Disinkronkan dari `members` lewat syncMembers(). */
  leadId: string;
  /** Semua anggota (lead, member, viewer). Disinkronkan dari `members`. */
  memberIds: string[];
  startDate: string;
  targetDate: string;
  status: ProjectStatus;
  description: string;
  /** Warna aksen project (token warna brand/neutral, mis. "var(--color-brand-brand-500)"). */
  color: string;
  members: ProjectMember[];
  labels: ProjectLabel[];
  /** Nama kolom untuk board baru. */
  defaultColumns: string[];
  /** Tautan cepat di header (id ProjectLink, maks 3). */
  quickLinkIds: string[];
  /** Peran kontak klien di project (kunci: CompanyContact.id). */
  clientContactRoles: Record<string, ClientContactRole>;
  archived: boolean;
};

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskComment = { id: string; authorId: string; body: string; createdAt: string };
export type Attachment = { id: string; name: string; url: string; size: number; uploadedBy: string; uploadedAt: string };

export type Task = {
  id: string;
  projectId: string;
  boardId: string;
  columnId: string;
  /** Nomor urut per project, tampil sebagai #17. */
  number: number;
  /** Urutan di dalam kolom (kecil = atas). */
  order: number;
  title: string;
  description: string;
  assigneeIds: string[];
  priority: TaskPriority;
  /** Id ProjectLabel. */
  labels: string[];
  storyId: string | null;
  sprintId: string | null;
  startDate: string | null;
  deadline: string | null;
  estimateHours: number | null;
  /** Id task lain yang harus selesai dulu. */
  dependsOn: string[];
  blocked: boolean;
  blockedReason: string | null;
  checklist: { id: string; text: string; done: boolean }[];
  comments: TaskComment[];
  attachments: Attachment[];
  createdBy: string;
  createdAt: string;
  /** Diisi saat masuk kolom selesai; dipakai burndown, velocity, S-curve. */
  completedAt: string | null;
};

export type BoardColumn = {
  id: string;
  projectId: string;
  boardId: string;
  name: string;
  order: number;
  isDone: boolean;
  color: string | null;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
};
