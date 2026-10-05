import type { ActivityCode, Holiday, Team, User } from "../types";

export const teams: Team[] = [
  { id: "t-mgmt", name: "Manajemen", kind: "support" },
  { id: "t-ops", name: "HR & Finance", kind: "support" },
  { id: "t-sales", name: "Sales", kind: "sales" },
  { id: "t-prod", name: "Produk", kind: "delivery" },
  { id: "t-data", name: "Data", kind: "delivery" },
  { id: "t-eng", name: "Engineering", kind: "delivery" },
];

export const users: User[] = [
  { id: "u1", employeeCode: "EMP-0001", name: "Rina Wijaya", email: "rina@perusahaan.co.id", role: "stakeholder", teamId: "t-mgmt", position: "Direktur Utama", joinDate: "2019-03-01", active: true },
  { id: "u10", employeeCode: "EMP-0002", name: "Hendra Gunawan", email: "hendra@perusahaan.co.id", role: "stakeholder", teamId: "t-mgmt", position: "Direktur Operasional", joinDate: "2019-03-01", active: true },
  { id: "u2", employeeCode: "EMP-0003", name: "Sari Hartono", email: "sari@perusahaan.co.id", role: "hr", teamId: "t-ops", position: "HR Manager", joinDate: "2020-07-15", active: true },
  { id: "u3", employeeCode: "EMP-0004", name: "Dewi Lestari", email: "dewi@perusahaan.co.id", role: "finance", teamId: "t-ops", position: "Finance Lead", joinDate: "2020-09-01", active: true },
  { id: "u4", employeeCode: "EMP-0012", name: "Budi Santoso", email: "budi@perusahaan.co.id", role: "employee", teamId: "t-eng", position: "Backend Engineer", joinDate: "2022-02-01", active: true },
  { id: "u8", employeeCode: "EMP-0015", name: "Rizky Ramadhan", email: "rizky@perusahaan.co.id", role: "employee", teamId: "t-eng", position: "Frontend Engineer", joinDate: "2023-05-08", active: true },
  { id: "u5", employeeCode: "EMP-0008", name: "Andi Pratama", email: "andi@perusahaan.co.id", role: "employee", teamId: "t-sales", position: "Account Executive", joinDate: "2021-11-01", active: true },
  { id: "u9", employeeCode: "EMP-0017", name: "Lina Kusuma", email: "lina@perusahaan.co.id", role: "employee", teamId: "t-sales", position: "Sales Executive", joinDate: "2024-01-15", active: true },
  { id: "u6", employeeCode: "EMP-0010", name: "Maya Putri", email: "maya@perusahaan.co.id", role: "employee", teamId: "t-prod", position: "Product Manager", joinDate: "2021-06-01", active: true },
  { id: "u7", employeeCode: "EMP-0011", name: "Fajar Nugroho", email: "fajar@perusahaan.co.id", role: "employee", teamId: "t-data", position: "Data Analyst", joinDate: "2022-08-22", active: true },
];

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
