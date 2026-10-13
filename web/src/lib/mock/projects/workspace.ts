/** Data dummy menu workspace: milestone, deliverable, MOM, catatan, decision, tautan, klien, CR, baseline. */
import { buildBaselinePoints } from "../../calc/project-charts";
import type {
  Baseline,
  ChangeRequest,
  ClientKeyAction,
  ClientTouchpoint,
  Decision,
  Deliverable,
  JoinRequest,
  Milestone,
  Mom,
  Note,
  ProjectLink,
} from "../../project-types";
import { tid } from "./base";
import { tasks } from "./tasks";

const t3 = (...n: number[]) => n.map((x) => tid("p3", x));
const t5 = (...n: number[]) => n.map((x) => tid("p5", x));
const iso = (date: string, time = "10:00") => `${date}T${time}:00.000+07:00`;

export const milestones: Milestone[] = [
  { id: "p3-m1", projectId: "p3", name: "Kickoff & desain disetujui", description: "Skema data dan wireframe disetujui klien.", targetDate: "2026-07-15", taskIds: t3(1, 13), completedAt: iso("2026-07-16") },
  { id: "p3-m2", projectId: "p3", name: "Integrasi pembayaran selesai", description: "Invoice dan pembayaran end-to-end di staging.", targetDate: "2026-08-31", taskIds: t3(2, 3, 4, 14, 15), completedAt: iso("2026-08-28") },
  { id: "p3-m3", projectId: "p3", name: "UAT selesai", description: "UAT bersama tim finance klien lulus.", targetDate: "2026-10-09", taskIds: t3(10, 23, 24, 30), completedAt: null },
  { id: "p3-m4", projectId: "p3", name: "Go-live v2.3", description: "Rilis produksi dan serah terima.", targetDate: "2026-10-15", taskIds: t3(26, 27, 28, 29), completedAt: null },
  { id: "p5-m1", projectId: "p5", name: "Desain disetujui", description: "Wireframe & hi-fi disetujui manajemen klien.", targetDate: "2026-10-03", taskIds: t5(3, 4), completedAt: null },
  { id: "p5-m2", projectId: "p5", name: "Beta internal", description: "Dashboard bisa dipakai tim dispatcher.", targetDate: "2026-11-15", taskIds: t5(8, 9, 10, 11), completedAt: null },
];

const dlv = (id: string, projectId: string, title: string, phase: Deliverable["phase"], status: Deliverable["status"], deadline: string | null, ownerId: string, link: string | null, description = ""): Deliverable =>
  ({ id, projectId, title, description, phase, status, deadline, link, ownerId, createdAt: iso("2026-07-01") });

export const deliverables: Deliverable[] = [
  dlv("p3-d1", "p3", "Proposal teknis & estimasi", "proposal", "sent", "2026-06-20", "u4", "https://drive.example.com/proposal-portal", "Ruang lingkup, arsitektur, dan estimasi biaya."),
  dlv("p3-d2", "p3", "Dokumen kebutuhan (SRS)", "requirement", "sent", "2026-07-08", "u6", "https://drive.example.com/srs-portal"),
  dlv("p3-d3", "p3", "Desain UI/UX portal", "design", "sent", "2026-07-20", "u6", "https://figma.example.com/portal"),
  dlv("p3-d4", "p3", "Dokumentasi API publik", "build", "in_progress", "2026-10-14", "u8", null),
  dlv("p3-d5", "p3", "Laporan hasil UAT", "testing", "draft", "2026-10-06", "u6", null, "Ringkasan skenario, temuan, dan status perbaikan."),
  dlv("p3-d6", "p3", "Berita acara serah terima", "final", "draft", "2026-10-16", "u4", null),
  dlv("p5-d1", "p5", "Laporan riset pengguna", "requirement", "sent", "2026-09-22", "u6", "https://drive.example.com/riset-dispatcher"),
  dlv("p5-d2", "p5", "Desain hi-fi dashboard", "design", "review", "2026-10-03", "u6", "https://figma.example.com/dashboard-sinar"),
  dlv("p5-d3", "p5", "Dashboard beta", "build", "draft", "2026-11-15", "u8", null),
];

export const moms: Mom[] = [
  {
    id: "p3-mom1", projectId: "p3", title: "Kickoff project Portal Pembayaran", meetingDate: "2026-07-02",
    attendeeIds: ["u4", "u6", "u8", "u5"], externalAttendees: ["Wulan Sari (COO)", "Citra Melati (IT Lead)"],
    body: "## Tujuan\nMitra bisa membuat invoice dan membayar tanpa email bolak-balik.\n\n## Keputusan\n- Payment gateway memakai vendor yang sudah dipakai klien.\n- Rilis bertahap: invoice dulu, lalu pembayaran.\n\n## Risiko\n- Akses sandbox gateway butuh 1–2 minggu.",
    actionItems: [
      { id: "a1", text: "Kirim kebutuhan akses sandbox ke vendor", assigneeId: "u4", dueDate: "2026-07-06", done: true, taskId: null },
      { id: "a2", text: "Draft wireframe portal", assigneeId: "u6", dueDate: "2026-07-15", done: true, taskId: tid("p3", 13) },
    ],
    attachments: [], status: "published", authorId: "u6", updatedAt: iso("2026-07-02", "16:00"),
  },
  {
    id: "p3-mom2", projectId: "p3", title: "Weekly sync #12", meetingDate: "2026-09-30",
    attendeeIds: ["u4", "u6", "u8"], externalAttendees: ["Bambang Hidayat (Finance)"],
    body: "## Progres\n- Notifikasi email selesai.\n- Retry transaksi masih review.\n\n## Catatan klien\nFinance minta laporan selisih rekonsiliasi dalam format Excel mereka.",
    actionItems: [
      { id: "a1", text: "Minta template laporan selisih ke finance klien", assigneeId: "u4", dueDate: "2026-10-03", done: true, taskId: null },
      { id: "a2", text: "Siapkan skenario UAT finance", assigneeId: "u6", dueDate: "2026-10-05", done: true, taskId: tid("p3", 24) },
      { id: "a3", text: "Cek ulang pembulatan total invoice", assigneeId: "u4", dueDate: "2026-10-06", done: false, taskId: tid("p3", 25) },
    ],
    attachments: [{ id: "f1", name: "progress-w12.pdf", url: "#", size: 230000, uploadedBy: "u6", uploadedAt: iso("2026-09-30", "15:00") }],
    status: "published", authorId: "u6", updatedAt: iso("2026-09-30", "17:00"),
  },
  {
    id: "p3-mom3", projectId: "p3", title: "Persiapan UAT", meetingDate: "2026-10-06",
    attendeeIds: ["u4", "u6"], externalAttendees: [],
    body: "## Agenda\n1. Jadwal UAT\n2. Data uji\n3. PIC dari klien\n\n## Catatan\n- UAT dijadwalkan 8–9 Oktober.",
    actionItems: [{ id: "a1", text: "Konfirmasi jadwal UAT ke klien", assigneeId: "u6", dueDate: "2026-10-07", done: false, taskId: null }],
    attachments: [], status: "draft", authorId: "u6", updatedAt: iso("2026-10-06", "14:00"),
  },
  {
    id: "p5-mom1", projectId: "p5", title: "Review wireframe dengan manajemen", meetingDate: "2026-09-26",
    attendeeIds: ["u6", "u8", "u7"], externalAttendees: ["Wulan Sari (COO)"],
    body: "## Hasil\n- Peta armada jadi fokus halaman utama.\n- KPI: ketepatan waktu, utilisasi armada, biaya per km.",
    actionItems: [{ id: "a1", text: "Revisi wireframe sesuai masukan", assigneeId: "u6", dueDate: "2026-09-30", done: true, taskId: null }],
    attachments: [], status: "published", authorId: "u6", updatedAt: iso("2026-09-26", "16:00"),
  },
];

const note = (id: string, projectId: string, title: string, body: string, tags: string[], authorId: string, date: string, pinned = false): Note =>
  ({ id, projectId, title, body, tags, authorId, updatedAt: iso(date), pinned });

export const notes: Note[] = [
  note("p3-n1", "p3", "Kredensial & akses lingkungan", "Akses staging & sandbox gateway dikelola lewat password manager tim.\n\n**Jangan** simpan kredensial di catatan ini.", ["akses"], "u4", "2026-07-08", true),
  note("p3-n2", "p3", "Alur status pembayaran", "`pending` → `paid` → `settled`\n\n`pending` → `failed` → retry (maks 5x) → `expired`", ["pembayaran", "teknis"], "u4", "2026-08-20", true),
  note("p3-n3", "p3", "Glosarium istilah klien", "- **Mitra**: perusahaan rekanan pengiriman\n- **Settlement**: dana masuk ke rekening klien", ["bisnis"], "u6", "2026-07-10"),
  note("p3-n4", "p3", "Checklist rilis", "- [ ] Backup database\n- [ ] Migrasi skema\n- [ ] Smoke test\n- [ ] Pengumuman ke mitra", ["rilis"], "u4", "2026-10-05"),
  note("p3-n5", "p3", "Ide perbaikan setelah go-live", "Pembayaran via QRIS dan auto-reminder invoice jatuh tempo.", ["ide"], "u6", "2026-09-15"),
  note("p5-n1", "p5", "Temuan riset dispatcher", "Dispatcher butuh tahu armada yang **terlambat > 30 menit** dalam satu lihat.", ["riset"], "u6", "2026-09-19", true),
  note("p5-n2", "p5", "Sumber data GPS", "Data GPS dikirim tiap 15 detik lewat MQTT. Disimpan agregat per menit.", ["data"], "u7", "2026-10-01"),
];

const dec = (id: string, projectId: string, number: number, title: string, category: string, status: Decision["status"], decidedById: string | null, decidedAt: string | null, body: [string, string, string], sourceMomId: string | null = null, supersedesId: string | null = null): Decision =>
  ({ id, projectId, number, title, category, status, decidedById, decidedAt, context: body[0], decision: body[1], consequences: body[2], sourceMomId, supersedesId });

export const decisions: Decision[] = [
  dec("p3-dr1", "p3", 1, "Memakai payment gateway milik klien", "Arsitektur", "accepted", "u1", "2026-07-02", ["Klien sudah punya kontrak dengan vendor gateway.", "Integrasi ke vendor yang sama.", "Bergantung pada SLA vendor."], "p3-mom1"),
  dec("p3-dr2", "p3", 2, "Retry manual oleh admin", "Pembayaran", "superseded", "u4", "2026-08-05", ["Transaksi gagal perlu diulang.", "Admin klien mengulang manual dari dashboard.", "Beban kerja admin tinggi."]),
  dec("p3-dr3", "p3", 3, "Retry otomatis dengan backoff eksponensial", "Pembayaran", "accepted", "u4", "2026-09-14", ["Retry manual terlalu banyak (DR-002).", "Sistem mengulang otomatis maks 5x.", "Perlu monitoring antrian retry."], null, "p3-dr2"),
  dec("p3-dr4", "p3", 4, "Laporan selisih dalam format Excel klien", "Pelaporan", "proposed", null, null, ["Finance klien memakai template sendiri.", "Ekspor laporan mengikuti template tersebut.", "Butuh contoh template dari klien."], "p3-mom2"),
  dec("p5-dr1", "p5", 1, "Peta armada jadi halaman utama", "Produk", "accepted", "u6", "2026-09-26", ["Manajemen paling sering cek posisi armada.", "Halaman utama = peta + ringkasan KPI.", "Grafik detail pindah ke tab kedua."], "p5-mom1"),
];

const link = (id: string, projectId: string, label: string, url: string, category: string, addedBy: string): ProjectLink => ({ id, projectId, label, url, category, addedBy });

export const projectLinks: ProjectLink[] = [
  link("p3-k1", "p3", "Repository portal", "https://github.com/perusahaan/portal-pembayaran", "Repo", "u4"),
  link("p3-k2", "p3", "Staging", "https://staging.portal.sinarlogistik.id", "Lingkungan", "u4"),
  link("p3-k3", "p3", "Desain Figma", "https://figma.example.com/portal", "Desain", "u6"),
  link("p3-k4", "p3", "SRS (Google Drive)", "https://drive.example.com/srs-portal", "Dokumen", "u6"),
  link("p3-k5", "p3", "Dokumentasi vendor gateway", "https://docs.gateway.example.com", "Lainnya", "u4"),
  link("p5-k1", "p5", "Desain Figma dashboard", "https://figma.example.com/dashboard-sinar", "Desain", "u6"),
  link("p5-k2", "p5", "Repository dashboard", "https://github.com/perusahaan/dashboard-sinar", "Repo", "u8"),
];

const tp = (id: string, projectId: string, date: string, type: ClientTouchpoint["type"], summary: string, outcome: string, participantIds: string[], contactIds: string[]): ClientTouchpoint =>
  ({ id, projectId, date, type, summary, outcome, participantIds, contactIds });

export const touchpoints: ClientTouchpoint[] = [
  tp("p3-tp1", "p3", "2026-07-02", "meeting", "Kickoff project", "Ruang lingkup & jadwal disepakati.", ["u4", "u6", "u8"], ["ct3", "ct5"]),
  tp("p3-tp2", "p3", "2026-07-21", "presentation", "Presentasi desain UI/UX", "Desain disetujui dengan 3 revisi kecil.", ["u6"], ["ct3", "ct4"]),
  tp("p3-tp3", "p3", "2026-08-18", "call", "Koordinasi akses produksi gateway", "Klien mengurus akses produksi ke vendor.", ["u4"], ["ct5"]),
  tp("p3-tp4", "p3", "2026-09-10", "visit", "Demo integrasi pembayaran di kantor klien", "Tim finance antusias, minta fitur retry otomatis.", ["u4", "u6"], ["ct4", "ct6"]),
  tp("p3-tp5", "p3", "2026-09-30", "meeting", "Weekly sync #12", "Disepakati format laporan selisih.", ["u4", "u6", "u8"], ["ct4"]),
  tp("p3-tp6", "p3", "2026-10-05", "email", "Konfirmasi jadwal UAT", "Klien setuju UAT 8–9 Oktober.", ["u6"], ["ct4", "ct6"]),
  tp("p5-tp1", "p5", "2026-09-26", "meeting", "Review wireframe", "Peta armada jadi halaman utama.", ["u6", "u8"], ["ct3"]),
  tp("p5-tp2", "p5", "2026-10-02", "email", "Permintaan sample data GPS", "Klien mengirim sample 1 minggu.", ["u7"], ["ct5"]),
];

export const keyActions: ClientKeyAction[] = [
  { id: "p3-ka1", projectId: "p3", title: "Kirim jadwal & skenario UAT", ownerId: "u6", dueDate: "2026-10-05", status: "done" },
  { id: "p3-ka2", projectId: "p3", title: "Minta log gateway untuk bug timeout", ownerId: "u4", dueDate: "2026-10-07", status: "open" },
  { id: "p3-ka3", projectId: "p3", title: "Konfirmasi tanggal go-live ke COO", ownerId: "u4", dueDate: "2026-10-10", status: "open" },
  { id: "p3-ka4", projectId: "p3", title: "Siapkan materi training admin klien", ownerId: "u6", dueDate: "2026-10-14", status: "open" },
  { id: "p5-ka1", projectId: "p5", title: "Jadwalkan uji usability dengan dispatcher", ownerId: "u6", dueDate: "2026-10-08", status: "open" },
];

const cr = (p: Omit<ChangeRequest, "decidedById" | "decidedAt" | "linkedTaskIds"> & Partial<ChangeRequest>): ChangeRequest =>
  ({ decidedById: null, decidedAt: null, linkedTaskIds: [], ...p });

export const changeRequests: ChangeRequest[] = [
  cr({ id: "p3-cr1", projectId: "p3", number: 1, title: "Retry otomatis transaksi gagal", description: "Mengganti retry manual dengan retry otomatis (lihat DR-003).", source: "client", requestedBy: "Bambang Hidayat", requestedAt: "2026-09-10", impactDays: 5, impactNote: "Menambah 1 task backend dan pengujian.", estimateHours: 24, status: "implemented", decidedById: "u1", decidedAt: "2026-09-12", linkedTaskIds: t3(10) }),
  cr({ id: "p3-cr2", projectId: "p3", number: 2, title: "Export laporan transaksi CSV", description: "Finance klien perlu ekspor CSV untuk pembukuan.", source: "client", requestedBy: "Doni Saputra", requestedAt: "2026-09-29", impactDays: 3, impactNote: "Kecil, bisa masuk Sprint 6.", estimateHours: 8, status: "approved", decidedById: "u4", decidedAt: "2026-10-01", linkedTaskIds: t3(9) }),
  cr({ id: "p3-cr3", projectId: "p3", number: 3, title: "Dukungan multi-mata uang", description: "Mitra luar negeri ingin bayar dalam USD.", source: "client", requestedBy: "Wulan Sari", requestedAt: "2026-10-05", impactDays: 15, impactNote: "Perlu kurs harian & perubahan skema invoice.", estimateHours: 60, status: "under_review" }),
  cr({ id: "p5-cr1", projectId: "p5", number: 1, title: "Tambah KPI biaya bahan bakar", description: "Manajemen ingin melihat biaya BBM per rute.", source: "client", requestedBy: "Wulan Sari", requestedAt: "2026-10-03", impactDays: 7, impactNote: "Butuh sumber data BBM dari klien.", estimateHours: 20, status: "submitted" }),
];

/** Baseline p3 dibuat 1 Juli saat rencana awal berisi 26 task (sekarang 30 → scope creep). */
const p3Planned = tasks.filter((t) => t.projectId === "p3" && t.createdAt.slice(0, 10) < "2026-10-01");
const p5Planned = tasks.filter((t) => t.projectId === "p5");

export const baselines: Baseline[] = [
  { id: "p3-bl1", projectId: "p3", name: "Rencana awal", createdAt: iso("2026-07-01"), taskCount: p3Planned.length, plannedPoints: buildBaselinePoints(p3Planned, "2026-07-01", "2026-10-15") },
  { id: "p5-bl1", projectId: "p5", name: "Rencana awal", createdAt: iso("2026-09-14"), taskCount: p5Planned.length, plannedPoints: buildBaselinePoints(p5Planned, "2026-08-15", "2026-12-15") },
];

export const joinRequests: JoinRequest[] = [
  { id: "p3-jr1", projectId: "p3", userId: "u9", requestedAt: iso("2026-10-06", "09:15") },
  { id: "p5-jr1", projectId: "p5", userId: "u5", requestedAt: iso("2026-10-05", "13:40") },
];
