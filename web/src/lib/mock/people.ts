import type { ActivityCode, BankAccount, Holiday, Team, User } from "../types";

export const teams: Team[] = [
  { id: "t-mgmt", name: "Management", kind: "support" },
  { id: "t-ops", name: "HR & Finance", kind: "support" },
  { id: "t-sales", name: "Sales", kind: "sales" },
  { id: "t-prod", name: "Product", kind: "delivery" },
  { id: "t-data", name: "Data", kind: "delivery" },
  { id: "t-eng", name: "Engineering", kind: "delivery" },
];

const baseUsers: User[] = [
  { id: "u1", employeeCode: "EMP-0001", name: "Rina Wijaya", email: "rina@perusahaan.co.id", role: "stakeholder", teamId: "t-mgmt", position: "Chief Executive Officer", joinDate: "2019-03-01", active: true },
  { id: "u10", employeeCode: "EMP-0002", name: "Hendra Gunawan", email: "hendra@perusahaan.co.id", role: "stakeholder", teamId: "t-mgmt", position: "Chief Operating Officer", joinDate: "2019-03-01", active: true },
  { id: "u2", employeeCode: "EMP-0003", name: "Sari Hartono", email: "sari@perusahaan.co.id", role: "hr", teamId: "t-ops", position: "HR Manager", joinDate: "2020-07-15", active: true },
  { id: "u3", employeeCode: "EMP-0004", name: "Dewi Lestari", email: "dewi@perusahaan.co.id", role: "finance", teamId: "t-ops", position: "Finance Lead", joinDate: "2020-09-01", active: true },
  { id: "u4", employeeCode: "EMP-0012", name: "Budi Santoso", email: "budi@perusahaan.co.id", role: "employee", teamId: "t-eng", position: "Backend Engineer", joinDate: "2022-02-01", active: true },
  { id: "u8", employeeCode: "EMP-0015", name: "Rizky Ramadhan", email: "rizky@perusahaan.co.id", role: "employee", teamId: "t-eng", position: "Frontend Engineer", joinDate: "2023-05-08", active: true },
  { id: "u5", employeeCode: "EMP-0008", name: "Andi Pratama", email: "andi@perusahaan.co.id", role: "employee", teamId: "t-sales", position: "Account Executive", joinDate: "2021-11-01", active: true },
  { id: "u9", employeeCode: "EMP-0017", name: "Lina Kusuma", email: "lina@perusahaan.co.id", role: "employee", teamId: "t-sales", position: "Sales Executive", joinDate: "2024-01-15", active: true },
  { id: "u6", employeeCode: "EMP-0010", name: "Maya Putri", email: "maya@perusahaan.co.id", role: "employee", teamId: "t-prod", position: "Product Manager", joinDate: "2021-06-01", active: true },
  { id: "u7", employeeCode: "EMP-0011", name: "Fajar Nugroho", email: "fajar@perusahaan.co.id", role: "employee", teamId: "t-data", position: "Data Analyst", joinDate: "2022-08-22", active: true },
  {
    id: "u11", employeeCode: "EXT-0001", name: "Rafi Hidayat", email: "rafi@rafistudio.id", role: "external", teamId: "t-sales", position: "Freelance videographer", joinDate: "2026-08-01", active: true,
    external: { company: "Rafi Studio", sponsorId: "u5", accessUntil: "2026-12-31" },
  },
];

const bank = (bankName: string, accountNumber: string, accountHolder: string, verified = true, updatedAt = "2026-01-15T10:00:00+07:00"): BankAccount => ({
  bankName, accountNumber, accountHolder, verified, verifiedBy: verified ? "u3" : null, updatedAt,
});

/** Rekening demo. Maya baru mengganti rekening (belum diverifikasi); Fajar belum mengisi. */
const banks: Record<string, BankAccount> = {
  u1: bank("BCA", "0123456789", "RINA WIJAYA"),
  u10: bank("Mandiri", "1230004567890", "HENDRA GUNAWAN"),
  u2: bank("BCA", "0987654321", "SARI HARTONO"),
  u3: bank("BNI", "0456789123", "DEWI LESTARI"),
  u4: bank("BCA", "2345678901", "BUDI SANTOSO"),
  u8: bank("BRI", "002301000456789", "RIZKY RAMADHAN"),
  u5: bank("BCA", "3456789012", "ANDI PRATAMA"),
  u9: bank("Mandiri", "1370009876543", "LINA KUSUMA"),
  u6: bank("Jago", "105678901234", "MAYA PUTRI", false, "2026-10-14T09:30:00+07:00"),
  u11: bank("BCA", "5678901234", "RAFI HIDAYAT"),
};

export const users: User[] = baseUsers.map((u) => ({ ...u, bankAccount: banks[u.id] ?? null }));

export const holidays: Holiday[] = [
  { date: "2026-01-01", name: "Tahun Baru Masehi" },
  { date: "2026-03-20", name: "Hari Raya Idul Fitri" },
  { date: "2026-03-21", name: "Hari Raya Idul Fitri" },
  { date: "2026-05-01", name: "Hari Buruh" },
  { date: "2026-05-27", name: "Idul Adha" },
  { date: "2026-08-17", name: "Hari Kemerdekaan RI" },
  { date: "2026-08-26", name: "Maulid Nabi Muhammad SAW" },
  { date: "2026-12-25", name: "Hari Raya Natal" },
];

export const activityCodes: ActivityCode[] = [
  { id: "meeting", name: "Meeting", active: true },
  { id: "development", name: "Development", active: true },
  { id: "research", name: "Riset", active: true },
  { id: "design", name: "Desain", active: true },
  { id: "analysis", name: "Analisis Data", active: true },
  { id: "sales", name: "Presentasi / Sales Call", active: true },
  { id: "admin", name: "Admin", active: true },
  { id: "review", name: "Review / QA", active: true },
];
