import type { BoardColumn, Company, Opportunity, Project, Task } from "../types";

export const companies: Company[] = [
  { id: "c1", name: "PT Maju Bersama", industry: "Retail", website: "majubersama.co.id", contacts: [{ name: "Agus Salim", title: "IT Manager", email: "agus@majubersama.co.id", phone: "0812-1111-2222" }] },
  { id: "c2", name: "PT Sinar Logistik", industry: "Logistik", website: "sinarlogistik.id", contacts: [{ name: "Wulan Sari", title: "COO", email: "wulan@sinarlogistik.id", phone: "0813-2222-3333" }] },
  { id: "c3", name: "Bank Nusantara Digital", industry: "Perbankan", website: "bnd.co.id", contacts: [{ name: "Teguh Prakoso", title: "VP Digital", email: "teguh@bnd.co.id", phone: "0811-3333-4444" }] },
  { id: "c4", name: "PT Agro Lestari", industry: "Agrikultur", website: "agrolestari.com", contacts: [{ name: "Nina Hapsari", title: "Head of Data", email: "nina@agrolestari.com", phone: "0815-4444-5555" }] },
  { id: "c5", name: "Klinik Sehat Sentosa", industry: "Kesehatan", website: "sehatsentosa.id", contacts: [{ name: "dr. Yudi", title: "Owner", email: "yudi@sehatsentosa.id", phone: "0816-5555-6666" }] },
];

export const STAGES = [
  { id: "lead", name: "Lead", probability: 10 },
  { id: "qualification", name: "Kualifikasi", probability: 25 },
  { id: "proposal", name: "Proposal", probability: 50 },
  { id: "negotiation", name: "Negosiasi", probability: 75 },
  { id: "won", name: "Won", probability: 100 },
  { id: "lost", name: "Lost", probability: 0 },
] as const;

export const opportunities: Opportunity[] = [
  { id: "o1", code: "OP260012", name: "Sistem POS Multi-cabang", companyId: "c1", ownerId: "u5", value: 450_000_000, stage: "negotiation", probability: 75, expectedClose: "2026-10-28", lostReason: null },
  { id: "o2", code: "OP260015", name: "Tracking Armada Real-time", companyId: "c2", ownerId: "u5", value: 780_000_000, stage: "proposal", probability: 50, expectedClose: "2026-11-15", lostReason: null },
  { id: "o3", code: "OP260018", name: "Mobile Banking Revamp", companyId: "c3", ownerId: "u9", value: 1_600_000_000, stage: "qualification", probability: 25, expectedClose: "2026-12-20", lostReason: null },
  { id: "o4", code: "OP260019", name: "Dashboard Prediksi Panen", companyId: "c4", ownerId: "u9", value: 320_000_000, stage: "lead", probability: 10, expectedClose: "2027-01-31", lostReason: null },
  { id: "o5", code: "OP260007", name: "Portal Pembayaran B2B", companyId: "c2", ownerId: "u5", value: 520_000_000, stage: "won", probability: 100, expectedClose: "2026-06-30", lostReason: null },
  { id: "o6", code: "OP260009", name: "Aplikasi Reservasi Pasien", companyId: "c5", ownerId: "u9", value: 210_000_000, stage: "won", probability: 100, expectedClose: "2026-09-30", lostReason: null },
  { id: "o7", code: "OP260004", name: "Data Warehouse Retail", companyId: "c1", ownerId: "u5", value: 380_000_000, stage: "won", probability: 100, expectedClose: "2026-05-15", lostReason: null },
  { id: "o8", code: "OP260011", name: "Chatbot Layanan Nasabah", companyId: "c3", ownerId: "u9", value: 260_000_000, stage: "lost", probability: 0, expectedClose: "2026-08-31", lostReason: "Klien memilih vendor dengan harga lebih rendah." },
];

export const projects: Project[] = [
  { id: "p3", code: "PR260003", name: "Portal Pembayaran B2B", opportunityId: "o5", teamIds: ["t-eng", "t-prod"], leadId: "u4", memberIds: ["u4", "u8", "u6"], startDate: "2026-07-01", targetDate: "2026-10-15", status: "ongoing" },
  { id: "p4", code: "PR260004", name: "Data Warehouse Retail", opportunityId: "o7", teamIds: ["t-data"], leadId: "u7", memberIds: ["u7"], startDate: "2026-05-20", targetDate: "2026-09-30", status: "ongoing" },
  { id: "p5", code: "PR260005", name: "Dashboard Klien Sinar", opportunityId: null, teamIds: ["t-eng", "t-prod"], leadId: "u6", memberIds: ["u6", "u8"], startDate: "2026-08-15", targetDate: "2026-12-15", status: "ongoing" },
  { id: "p2", code: "PR260002", name: "Website Company Profile", opportunityId: null, teamIds: ["t-eng"], leadId: "u8", memberIds: ["u8"], startDate: "2026-02-01", targetDate: "2026-04-30", status: "done" },
];

const defaultColumns = ["Backlog", "To Do", "In Progress", "Review", "Done"];

export const boardColumns: BoardColumn[] = projects.flatMap((p) =>
  defaultColumns.map((name, i) => ({ id: `${p.id}-c${i}`, projectId: p.id, name, order: i, isDone: name === "Done" })),
);

type TaskSeed = [string, number, string, string | null, Task["priority"], string | null, string[]];

const taskSeeds: TaskSeed[] = [
  ["p3", 4, "Desain skema database invoice", "u4", "high", "2026-07-20", ["backend"]],
  ["p3", 4, "Integrasi payment gateway", "u4", "urgent", "2026-09-10", ["backend"]],
  ["p3", 4, "Halaman daftar invoice", "u8", "medium", "2026-09-01", ["frontend"]],
  ["p3", 4, "Notifikasi email pembayaran", "u4", "medium", "2026-09-20", ["backend"]],
  ["p3", 3, "UAT dengan tim finance klien", "u6", "high", "2026-10-08", ["uat"]],
  ["p3", 2, "Rekonsiliasi otomatis harian", "u4", "high", "2026-10-10", ["backend"]],
  ["p3", 1, "Dokumentasi API publik", "u8", "low", "2026-10-14", ["docs"]],
  ["p4", 4, "Ekstraksi data POS", "u7", "high", "2026-07-15", ["etl"]],
  ["p4", 4, "Model data penjualan", "u7", "high", "2026-08-15", ["modeling"]],
  ["p4", 2, "Dashboard retensi pelanggan", "u7", "medium", "2026-09-30", ["bi"]],
  ["p4", 1, "Serah terima dan training", "u7", "medium", "2026-10-10", []],
  ["p5", 4, "Riset kebutuhan pengguna", "u6", "medium", "2026-08-30", ["research"]],
  ["p5", 3, "Wireframe dashboard", "u6", "medium", "2026-09-20", ["design"]],
  ["p5", 2, "Komponen grafik armada", "u8", "high", "2026-10-20", ["frontend"]],
  ["p5", 1, "Integrasi API tracking", "u8", "high", "2026-11-01", ["frontend"]],
  ["p5", 0, "Mode offline", null, "low", null, []],
  ["p2", 4, "Desain halaman", "u8", "medium", "2026-03-01", []],
  ["p2", 4, "Go-live", "u8", "high", "2026-04-28", []],
];

export const tasks: Task[] = taskSeeds.map(([projectId, col, title, assigneeId, priority, deadline, labels], i) => ({
  id: `task${i + 1}`,
  projectId,
  columnId: `${projectId}-c${col}`,
  title,
  assigneeId,
  priority,
  deadline,
  labels,
  checklist: [],
}));
