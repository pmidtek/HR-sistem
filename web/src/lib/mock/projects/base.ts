/** Data dummy project: project, board, kolom, epic, story, sprint. ID task = `${projectId}-t${nomor}`. */
import type { Board, Epic, ProjectLabel, ProjectMember, Sprint, Story } from "../../project-types";
import { syncMembers } from "../../projects";
import type { BoardColumn, Project } from "../../types";

export const tid = (projectId: string, n: number) => `${projectId}-t${n}`;

const C = {
  brand: "var(--color-brand-brand-500)",
  brandLight: "var(--color-brand-brand-300)",
  brandDark: "var(--color-brand-brand-700)",
  neutral: "var(--color-neutral-400)",
  success: "var(--color-success-500)",
  danger: "var(--color-danger-500)",
  warning: "var(--color-warning-500)",
};

const labels = (projectId: string, list: [string, string][]): ProjectLabel[] =>
  list.map(([name, color], i) => ({ id: `${projectId}-l${i + 1}`, name, color }));

const members = (list: [string, ProjectMember["role"], string][]): ProjectMember[] =>
  list.map(([userId, role, joinedAt]) => ({ userId, role, joinedAt }));

const DEFAULT_COLUMNS = ["Backlog", "To Do", "In Progress", "Review", "Done"];

const base = { color: C.brand, defaultColumns: DEFAULT_COLUMNS, quickLinkIds: [], clientContactRoles: {}, archived: false };

export const projects: Project[] = [
  syncMembers({
    ...base,
    id: "p3", code: "PR260003", name: "Portal Pembayaran B2B", opportunityId: "o5", companyId: "c2",
    teamIds: ["t-eng", "t-prod"], startDate: "2026-07-01", targetDate: "2026-10-15", status: "ongoing",
    description: "Portal bagi mitra PT Sinar Logistik untuk membuat invoice, membayar lewat payment gateway, dan memantau rekonsiliasi.",
    members: members([["u4", "lead", "2026-07-01"], ["u8", "member", "2026-07-01"], ["u6", "member", "2026-07-03"], ["u5", "viewer", "2026-07-10"]]),
    labels: labels("p3", [["backend", C.brandDark], ["frontend", C.brand], ["api", C.brandLight], ["bug", C.danger], ["uat", C.success], ["docs", C.neutral], ["infra", C.warning], ["design", C.brandLight]]),
    quickLinkIds: ["p3-k1", "p3-k2", "p3-k3"],
    clientContactRoles: { ct3: "decision_maker", ct4: "finance", ct5: "technical", ct6: "user" },
  }),
  syncMembers({
    ...base,
    id: "p5", code: "PR260005", name: "Dashboard Klien Sinar", opportunityId: null, companyId: "c2", color: C.brandDark,
    teamIds: ["t-prod", "t-eng", "t-data"], startDate: "2026-08-15", targetDate: "2026-12-15", status: "ongoing",
    description: "Dashboard armada & pengiriman real-time untuk manajemen PT Sinar Logistik.",
    members: members([["u6", "lead", "2026-08-15"], ["u8", "member", "2026-08-15"], ["u7", "member", "2026-08-20"], ["u4", "viewer", "2026-09-01"]]),
    labels: labels("p5", [["research", C.neutral], ["design", C.brandLight], ["frontend", C.brand], ["data", C.success], ["bug", C.danger]]),
    quickLinkIds: ["p5-k1"],
    clientContactRoles: { ct3: "decision_maker", ct5: "technical" },
  }),
  syncMembers({
    ...base,
    id: "p4", code: "PR260004", name: "Data Warehouse Retail", opportunityId: "o7", companyId: "c1", color: C.success,
    teamIds: ["t-data"], startDate: "2026-05-20", targetDate: "2026-09-30", status: "ongoing",
    description: "Data warehouse penjualan & retensi pelanggan PT Maju Bersama.",
    members: members([["u7", "lead", "2026-05-20"]]),
    labels: labels("p4", [["etl", C.brand], ["modeling", C.brandDark], ["bi", C.success]]),
  }),
  syncMembers({
    ...base,
    id: "p2", code: "PR260002", name: "Website Company Profile", opportunityId: null, companyId: null, color: C.neutral,
    teamIds: ["t-eng"], startDate: "2026-02-01", targetDate: "2026-04-30", status: "done",
    description: "Website profil perusahaan (internal).",
    members: members([["u8", "lead", "2026-02-01"]]),
    labels: labels("p2", [["web", C.brand]]),
  }),
];

export const boards: Board[] = [
  { id: "p3-b1", projectId: "p3", name: "Backend", order: 0 },
  { id: "p3-b2", projectId: "p3", name: "Frontend", order: 1 },
  { id: "p3-b3", projectId: "p3", name: "QA & Rilis", order: 2 },
  { id: "p5-b1", projectId: "p5", name: "Produk & Desain", order: 0 },
  { id: "p5-b2", projectId: "p5", name: "Development", order: 1 },
  { id: "p4-b1", projectId: "p4", name: "Data Warehouse", order: 0 },
  { id: "p2-b1", projectId: "p2", name: "Website", order: 0 },
];

const cols = (boardId: string, projectId: string, names: string[], doneName: string): BoardColumn[] =>
  names.map((name, i) => ({ id: `${boardId}-c${i}`, projectId, boardId, name, order: i, isDone: name === doneName, color: null }));

export const boardColumns: BoardColumn[] = [
  ...["p3-b1", "p3-b2"].flatMap((b) => cols(b, "p3", DEFAULT_COLUMNS, "Done")),
  ...cols("p3-b3", "p3", ["To Test", "Testing", "Need to Fix", "Passed"], "Passed"),
  ...cols("p5-b1", "p5", ["Ide", "Riset", "Desain", "Disetujui"], "Disetujui"),
  ...cols("p5-b2", "p5", DEFAULT_COLUMNS, "Done"),
  ...cols("p4-b1", "p4", DEFAULT_COLUMNS, "Done"),
  ...cols("p2-b1", "p2", DEFAULT_COLUMNS, "Done"),
];

export const epics: Epic[] = [
  { id: "p3-e1", projectId: "p3", title: "Invoice", description: "Pembuatan & pengelolaan invoice mitra.", color: C.brand },
  { id: "p3-e2", projectId: "p3", title: "Pembayaran", description: "Integrasi gateway, status, dan retry.", color: C.brandDark },
  { id: "p3-e3", projectId: "p3", title: "Keamanan & Akses", description: "Login partner, audit, dan keamanan.", color: C.warning },
  { id: "p3-e4", projectId: "p3", title: "Pelaporan & Notifikasi", description: "Laporan, rekonsiliasi, email.", color: C.success },
  { id: "p3-e5", projectId: "p3", title: "Kualitas & Rilis", description: "UAT, testing, dan rilis.", color: C.neutral },
  { id: "p5-e1", projectId: "p5", title: "Riset & Desain", description: "Kebutuhan pengguna dan desain dashboard.", color: C.brandLight },
  { id: "p5-e2", projectId: "p5", title: "Visualisasi Armada", description: "Peta, grafik, dan data real-time.", color: C.brand },
];

const st = (id: string, epicId: string, title: string): Story => ({ id, epicId, title });

export const stories: Story[] = [
  st("st-inv-1", "p3-e1", "Backend invoice"), st("st-inv-2", "p3-e1", "UI invoice"),
  st("st-pay-1", "p3-e2", "Integrasi gateway"), st("st-pay-2", "p3-e2", "Status & retry"), st("st-pay-3", "p3-e2", "UI pembayaran"),
  st("st-auth", "p3-e3", "Login partner"), st("st-sec", "p3-e3", "Audit & keamanan"),
  st("st-rep", "p3-e4", "Laporan"), st("st-rec", "p3-e4", "Rekonsiliasi"), st("st-notif", "p3-e4", "Notifikasi"), st("st-docs", "p3-e4", "Dokumentasi"),
  st("st-qa", "p3-e5", "Testing & UAT"), st("st-rel", "p3-e5", "Rilis"), st("st-ux", "p3-e5", "UX & aksesibilitas"),
  st("st5-res", "p5-e1", "Riset pengguna"), st("st5-ui", "p5-e1", "Desain dashboard"),
  st("st5-map", "p5-e2", "Peta armada"), st("st5-chart", "p5-e2", "Grafik & KPI"),
];

const t3 = (...n: number[]) => n.map((x) => tid("p3", x));
const t5 = (...n: number[]) => n.map((x) => tid("p5", x));

export const sprints: Sprint[] = [
  { id: "p3-s4", projectId: "p3", teamId: "t-eng", name: "Sprint 4", goal: "Webhook pembayaran & form invoice", startDate: "2026-09-07", endDate: "2026-09-18", status: "completed", plannedTaskIds: t3(5, 16, 10), completedAt: "2026-09-18T17:00:00.000Z" },
  { id: "p3-s5", projectId: "p3", teamId: "t-eng", name: "Sprint 5", goal: "Retry transaksi, notifikasi, dan persiapan UAT", startDate: "2026-09-21", endDate: "2026-10-02", status: "completed", plannedTaskIds: t3(7, 10, 17, 20, 23, 30), completedAt: "2026-10-02T17:00:00.000Z" },
  { id: "p3-s6", projectId: "p3", teamId: "t-eng", name: "Sprint 6", goal: "Rekonsiliasi, dashboard pembayaran, dan siap UAT", startDate: "2026-10-05", endDate: "2026-10-16", status: "active", plannedTaskIds: t3(6, 8, 9, 10, 18, 20, 21, 24, 25, 26, 27), completedAt: null },
  { id: "p3-s7", projectId: "p3", teamId: "t-eng", name: "Sprint 7", goal: "Stabilisasi pasca rilis", startDate: "2026-10-19", endDate: "2026-10-30", status: "planned", plannedTaskIds: [], completedAt: null },
  { id: "p5-s1", projectId: "p5", teamId: "t-prod", name: "Sprint 1", goal: "Riset & wireframe", startDate: "2026-09-14", endDate: "2026-09-25", status: "completed", plannedTaskIds: t5(1, 2, 3, 4), completedAt: "2026-09-25T17:00:00.000Z" },
  { id: "p5-s2", projectId: "p5", teamId: "t-eng", name: "Sprint 2", goal: "Peta armada & komponen grafik", startDate: "2026-09-28", endDate: "2026-10-09", status: "active", plannedTaskIds: t5(5, 6, 7, 8, 9), completedAt: null },
];
