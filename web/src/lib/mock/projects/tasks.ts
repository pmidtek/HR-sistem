/** Task dummy untuk project p3 (30 task) dan p5 (16 task), plus beberapa untuk p4 & p2. */
import type { Task, TaskPriority } from "../../types";
import { boardColumns, projects, tid } from "./base";

type Seed = {
  n: number;
  b: number;
  c: number;
  title: string;
  a?: string[];
  p?: TaskPriority;
  l?: string[];
  st?: string;
  sp?: string;
  s?: string;
  d?: string;
  e?: number;
  /** Tanggal selesai (task berada di kolom selesai). */
  done?: string;
  dep?: number[];
  blocked?: string;
  created?: string;
  desc?: string;
  sub?: [string, boolean][];
  cmt?: [string, string, string][];
  att?: [string, number, string][];
};

function build(projectId: string, seeds: Seed[]): Task[] {
  const project = projects.find((p) => p.id === projectId);
  const labelId = (name: string) => project?.labels.find((l) => l.name === name)?.id ?? name;
  return seeds.map((x) => {
    const boardId = `${projectId}-b${x.b}`;
    const columns = boardColumns.filter((c) => c.boardId === boardId).sort((a, b) => a.order - b.order);
    const col = x.done ? (columns.find((c) => c.isDone) ?? columns[columns.length - 1]) : columns[x.c];
    // Task rencana awal dibuat saat project mulai; task tambahan memakai `created` eksplisit.
    const created = x.created ?? project?.startDate ?? "2026-07-01";
    return {
      id: tid(projectId, x.n), projectId, boardId, columnId: col.id, number: x.n, order: x.n,
      title: x.title, description: x.desc ?? "", assigneeIds: x.a ?? [], priority: x.p ?? "medium",
      labels: (x.l ?? []).map(labelId), storyId: x.st ?? null, sprintId: x.sp ?? null,
      startDate: x.s ?? null, deadline: x.d ?? null, estimateHours: x.e ?? null,
      dependsOn: (x.dep ?? []).map((d) => tid(projectId, d)), blocked: Boolean(x.blocked), blockedReason: x.blocked ?? null,
      checklist: (x.sub ?? []).map(([text, done], i) => ({ id: `${tid(projectId, x.n)}-ck${i}`, text, done })),
      comments: (x.cmt ?? []).map(([authorId, body, at], i) => ({ id: `${tid(projectId, x.n)}-cm${i}`, authorId, body, createdAt: at })),
      attachments: (x.att ?? []).map(([name, size, by], i) => ({ id: `${tid(projectId, x.n)}-at${i}`, name, url: "#", size, uploadedBy: by, uploadedAt: `${created}T10:00:00.000Z` })),
      createdBy: project?.leadId ?? "u1", createdAt: `${created}T09:00:00.000Z`,
      completedAt: x.done ? `${x.done}T16:00:00.000Z` : null,
    };
  });
}

const p3: Seed[] = [
  // Board 1: Backend (Backlog, To Do, In Progress, Review, Done)
  { n: 1, b: 1, c: 4, title: "Desain skema database invoice", a: ["u4"], p: "high", l: ["backend"], st: "st-inv-1", s: "2026-07-01", d: "2026-07-10", e: 16, done: "2026-07-09", created: "2026-07-01" },
  { n: 2, b: 1, c: 4, title: "API autentikasi partner (OAuth2)", a: ["u4"], p: "high", l: ["backend", "api"], st: "st-auth", s: "2026-07-06", d: "2026-07-17", e: 24, done: "2026-07-16" },
  { n: 3, b: 1, c: 4, title: "Endpoint buat invoice", a: ["u4"], p: "high", l: ["api"], st: "st-inv-1", s: "2026-07-13", d: "2026-07-24", e: 20, done: "2026-07-24", dep: [1] },
  { n: 4, b: 1, c: 4, title: "Integrasi payment gateway", a: ["u4", "u8"], p: "urgent", l: ["backend", "api"], st: "st-pay-1", s: "2026-07-27", d: "2026-08-14", e: 40, done: "2026-08-17", dep: [3],
    att: [["spesifikasi-gateway-v3.pdf", 842000, "u4"]] },
  { n: 5, b: 1, c: 4, title: "Webhook status pembayaran", a: ["u4"], p: "high", l: ["api"], st: "st-pay-2", sp: "p3-s4", s: "2026-08-31", d: "2026-09-11", e: 16, done: "2026-09-10", dep: [4] },
  { n: 6, b: 1, c: 2, title: "Rekonsiliasi otomatis harian", a: ["u4"], p: "high", l: ["backend"], st: "st-rec", sp: "p3-s6", s: "2026-10-05", d: "2026-10-10", e: 24, dep: [5],
    desc: "Job harian jam 01.00 yang mencocokkan transaksi gateway dengan invoice.\n\n- Selisih dicatat ke tabel `reconciliation_issues`\n- Ringkasan dikirim ke tim finance klien",
    sub: [["Query transaksi gateway", true], ["Matching invoice", true], ["Laporan selisih", false], ["Penjadwalan cron", false]],
    cmt: [["u6", "Format laporan selisih ikut template finance klien ya.", "2026-10-06T10:12:00.000Z"], ["u4", "Siap, sudah saya minta contoh ke Pak Bambang.", "2026-10-06T11:03:00.000Z"]] },
  { n: 7, b: 1, c: 4, title: "Notifikasi email pembayaran", a: ["u4"], p: "medium", l: ["backend"], st: "st-notif", sp: "p3-s5", s: "2026-09-21", d: "2026-09-30", e: 12, done: "2026-09-29" },
  { n: 8, b: 1, c: 4, title: "Rate limiting & audit log", a: ["u4"], p: "medium", l: ["backend", "infra"], st: "st-sec", sp: "p3-s6", s: "2026-10-05", d: "2026-10-09", e: 10, done: "2026-10-06" },
  { n: 9, b: 1, c: 4, title: "Export laporan transaksi CSV", a: ["u8"], p: "medium", l: ["backend"], st: "st-rep", sp: "p3-s6", s: "2026-10-06", d: "2026-10-13", e: 8, done: "2026-10-07" },
  { n: 10, b: 1, c: 3, title: "Retry otomatis transaksi gagal", a: ["u4"], p: "high", l: ["backend"], st: "st-pay-2", sp: "p3-s6", s: "2026-09-14", d: "2026-10-02", e: 16, dep: [5],
    cmt: [["u8", "Backoff-nya pakai eksponensial maks 5x ya, sesuai saran vendor.", "2026-09-25T09:30:00.000Z"]] },
  { n: 11, b: 1, c: 0, title: "Dokumentasi API publik", a: ["u8"], p: "low", l: ["docs"], st: "st-docs", s: "2026-10-08", d: "2026-10-14", e: 6 },
  { n: 12, b: 1, c: 0, title: "Optimasi query dashboard", p: "medium", l: ["backend"], st: "st-rep" },
  // Board 2: Frontend
  { n: 13, b: 2, c: 4, title: "Wireframe portal klien", a: ["u6"], p: "medium", l: ["design"], st: "st-ux", s: "2026-07-06", d: "2026-07-15", e: 16, done: "2026-07-15" },
  { n: 14, b: 2, c: 4, title: "Halaman login & SSO", a: ["u8"], p: "high", l: ["frontend"], st: "st-auth", s: "2026-07-20", d: "2026-07-31", e: 16, done: "2026-07-31", dep: [2] },
  { n: 15, b: 2, c: 4, title: "Halaman daftar invoice", a: ["u8"], p: "medium", l: ["frontend"], st: "st-inv-2", s: "2026-08-10", d: "2026-08-28", e: 20, done: "2026-08-27", dep: [3] },
  { n: 16, b: 2, c: 4, title: "Form buat invoice", a: ["u8"], p: "high", l: ["frontend"], st: "st-inv-2", sp: "p3-s4", s: "2026-09-07", d: "2026-09-15", e: 16, done: "2026-09-15" },
  { n: 17, b: 2, c: 4, title: "Halaman detail pembayaran", a: ["u8"], p: "medium", l: ["frontend"], st: "st-pay-3", sp: "p3-s5", s: "2026-09-21", d: "2026-10-01", e: 12, done: "2026-10-03" },
  { n: 18, b: 2, c: 2, title: "Dashboard ringkasan pembayaran", a: ["u8", "u6"], p: "high", l: ["frontend"], st: "st-rep", sp: "p3-s6", s: "2026-10-05", d: "2026-10-12", e: 20,
    sub: [["Kartu KPI", true], ["Grafik tren", false], ["Filter periode", false]] },
  { n: 19, b: 2, c: 0, title: "Mode gelap portal", p: "low", l: ["frontend"], st: "st-ux" },
  { n: 20, b: 2, c: 2, title: "Validasi form & pesan error", a: ["u8"], p: "medium", l: ["frontend"], st: "st-inv-2", sp: "p3-s6", s: "2026-09-28", d: "2026-10-03", e: 8 },
  { n: 21, b: 2, c: 1, title: "Upload bukti transfer manual", a: ["u8"], p: "medium", l: ["frontend"], st: "st-pay-3", sp: "p3-s6", s: "2026-10-07", d: "2026-10-14", e: 10, dep: [17] },
  { n: 22, b: 2, c: 1, title: "Aksesibilitas & responsive", a: ["u6"], p: "low", l: ["frontend", "design"], st: "st-ux", s: "2026-10-12", d: "2026-10-15", e: 8 },
  // Board 3: QA & Rilis (To Test, Testing, Need to Fix, Passed)
  { n: 23, b: 3, c: 3, title: "Test case modul invoice", a: ["u6"], p: "medium", l: ["uat"], st: "st-qa", sp: "p3-s5", s: "2026-09-21", d: "2026-09-26", e: 8, done: "2026-09-26" },
  { n: 24, b: 3, c: 1, title: "UAT dengan tim finance klien", a: ["u6"], p: "high", l: ["uat"], st: "st-qa", sp: "p3-s6", s: "2026-10-06", d: "2026-10-09", e: 12, dep: [10],
    att: [["skenario-uat-v2.xlsx", 56000, "u6"]] },
  { n: 25, b: 3, c: 2, title: "Bug: total invoice tidak dibulatkan", a: ["u4"], p: "urgent", l: ["bug"], sp: "p3-s6", s: "2026-10-05", d: "2026-10-06", e: 3, created: "2026-10-05" },
  { n: 26, b: 3, c: 2, title: "Bug: timeout gateway saat jam sibuk", a: ["u4"], p: "urgent", l: ["bug"], sp: "p3-s6", s: "2026-10-03", d: "2026-10-06", e: 8, created: "2026-10-03",
    blocked: "Menunggu akses log dari vendor payment gateway.",
    cmt: [["u4", "Tiket ke vendor: GW-88213. Mereka janji kirim log besok.", "2026-10-06T15:20:00.000Z"]] },
  { n: 27, b: 3, c: 0, title: "Load test 500 transaksi/menit", a: ["u8"], p: "high", l: ["infra"], st: "st-qa", sp: "p3-s6", s: "2026-10-08", d: "2026-10-12", e: 10, dep: [26], created: "2026-10-02" },
  { n: 28, b: 3, c: 0, title: "Security review internal", p: "high", l: ["infra"], st: "st-sec", s: "2026-10-09", d: "2026-10-13", e: 12, created: "2026-10-02" },
  { n: 29, b: 3, c: 0, title: "Persiapan rilis v2.3", a: ["u4"], p: "high", l: ["infra"], st: "st-rel", s: "2026-10-12", d: "2026-10-15", e: 8, dep: [24, 27] },
  { n: 30, b: 3, c: 3, title: "Regression test portal", a: ["u6"], p: "medium", l: ["uat"], st: "st-qa", sp: "p3-s5", s: "2026-09-29", d: "2026-10-02", e: 8, done: "2026-10-02" },
];

const p5: Seed[] = [
  // Board 1: Produk & Desain (Ide, Riset, Desain, Disetujui)
  { n: 1, b: 1, c: 3, title: "Wawancara 5 dispatcher", a: ["u6"], p: "high", l: ["research"], st: "st5-res", sp: "p5-s1", s: "2026-09-14", d: "2026-09-18", e: 10, done: "2026-09-18" },
  { n: 2, b: 1, c: 3, title: "Peta kebutuhan KPI manajemen", a: ["u6", "u7"], p: "medium", l: ["research", "data"], st: "st5-res", sp: "p5-s1", s: "2026-09-15", d: "2026-09-22", e: 8, done: "2026-09-23" },
  { n: 3, b: 1, c: 3, title: "Wireframe dashboard utama", a: ["u6"], p: "high", l: ["design"], st: "st5-ui", sp: "p5-s1", s: "2026-09-21", d: "2026-09-25", e: 12, done: "2026-09-25" },
  { n: 4, b: 1, c: 2, title: "Desain hi-fi & design system", a: ["u6"], p: "medium", l: ["design"], st: "st5-ui", sp: "p5-s1", s: "2026-09-24", d: "2026-10-02", e: 16 },
  { n: 5, b: 1, c: 1, title: "Uji usability prototipe", a: ["u6"], p: "medium", l: ["research"], st: "st5-res", sp: "p5-s2", s: "2026-10-08", d: "2026-10-14", e: 8, dep: [4] },
  { n: 6, b: 1, c: 0, title: "Ide: notifikasi keterlambatan armada", p: "low", l: ["research"] },
  // Board 2: Development
  { n: 7, b: 2, c: 4, title: "Setup pipeline data GPS", a: ["u7"], p: "high", l: ["data"], st: "st5-map", sp: "p5-s2", s: "2026-09-28", d: "2026-10-03", e: 16, done: "2026-10-02" },
  { n: 8, b: 2, c: 2, title: "Peta armada real-time", a: ["u8"], p: "high", l: ["frontend"], st: "st5-map", sp: "p5-s2", s: "2026-10-01", d: "2026-10-09", e: 24, dep: [7],
    sub: [["Render marker", true], ["Clustering", false], ["Auto refresh 30 dtk", false]] },
  { n: 9, b: 2, c: 3, title: "Komponen grafik KPI", a: ["u8"], p: "medium", l: ["frontend"], st: "st5-chart", sp: "p5-s2", s: "2026-09-30", d: "2026-10-06", e: 12 },
  { n: 10, b: 2, c: 1, title: "API agregasi pengiriman harian", a: ["u7"], p: "medium", l: ["data"], st: "st5-chart", s: "2026-10-08", d: "2026-10-20", e: 16, dep: [7] },
  { n: 11, b: 2, c: 1, title: "Filter wilayah & cabang", a: ["u8"], p: "medium", l: ["frontend"], st: "st5-chart", s: "2026-10-13", d: "2026-10-24", e: 8 },
  { n: 12, b: 2, c: 0, title: "Ekspor laporan PDF", p: "low", l: ["frontend"], st: "st5-chart", d: "2026-11-20" },
  { n: 13, b: 2, c: 0, title: "Integrasi login SSO klien", a: ["u8"], p: "medium", l: ["frontend"], s: "2026-11-02", d: "2026-11-13", e: 12 },
  { n: 14, b: 2, c: 0, title: "Load test dashboard", a: ["u7"], p: "medium", l: ["data"], s: "2026-11-23", d: "2026-11-30", e: 8, dep: [8, 10] },
  { n: 15, b: 2, c: 2, title: "Bug: marker dobel saat reconnect", a: ["u8"], p: "high", l: ["bug"], sp: "p5-s2", s: "2026-10-05", d: "2026-10-06", e: 4, created: "2026-10-05" },
  { n: 16, b: 2, c: 0, title: "UAT dengan manajemen klien", a: ["u6"], p: "high", s: "2026-12-01", d: "2026-12-10", e: 12, dep: [14] },
];

const p4: Seed[] = [
  { n: 1, b: 1, c: 4, title: "Ekstraksi data POS", a: ["u7"], p: "high", l: ["etl"], s: "2026-06-01", d: "2026-07-15", done: "2026-07-14" },
  { n: 2, b: 1, c: 4, title: "Model data penjualan", a: ["u7"], p: "high", l: ["modeling"], s: "2026-07-15", d: "2026-08-15", done: "2026-08-14" },
  { n: 3, b: 1, c: 2, title: "Dashboard retensi pelanggan", a: ["u7"], p: "medium", l: ["bi"], s: "2026-08-20", d: "2026-09-30" },
  { n: 4, b: 1, c: 1, title: "Serah terima dan training", a: ["u7"], p: "medium", s: "2026-10-05", d: "2026-10-10" },
];

const p2: Seed[] = [
  { n: 1, b: 1, c: 4, title: "Desain halaman", a: ["u8"], l: ["web"], s: "2026-02-01", d: "2026-03-01", done: "2026-02-27" },
  { n: 2, b: 1, c: 4, title: "Go-live", a: ["u8"], p: "high", l: ["web"], s: "2026-04-20", d: "2026-04-28", done: "2026-04-28" },
];

export const tasks: Task[] = [...build("p3", p3), ...build("p5", p5), ...build("p4", p4), ...build("p2", p2)];
