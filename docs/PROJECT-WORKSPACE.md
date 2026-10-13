# Spec: Project Workspace (halaman detail project)

> Brief untuk agent. Baca juga `CLAUDE.md` dan `BRIEF.md` (Bagian 9) sebelum mulai.
> Dokumen ini **menggantikan dan memperluas** BRIEF.md Bagian 9.

## 0. Konteks & batasan

- Saat ini halaman `web/src/app/(app)/projects/[id]/page.tsx` berisi satu halaman: header, kartu stat, dan tab Board/List.
- Tujuan: ubah menjadi **workspace project** dengan **sidebar menu kedua** (di samping sidebar utama aplikasi). Setiap menu adalah **route terpisah**.
- Masih **frontend-only**: data dummy di store (`web/src/store/`, `web/src/lib/mock/`). Semua mutasi lewat fungsi di `web/src/store/actions*.ts` (simulasi endpoint), jangan ubah state langsung dari komponen.
- Logic murni (hitung progress, deteksi terlambat, burndown, S-curve, dll) taruh di `web/src/lib/calc/` dan **wajib unit test**.
- Pakai komponen UI yang sudah ada di `web/src/components/ui/` (Cartogram Design System). Jangan tambah library UI baru tanpa tanya.
- Bahasa UI: Bahasa Indonesia. Nama kode/tipe: English.
- Ukuran file: page ≤ 150 baris, komponen ≤ 250 baris. Pecah per section.
- TypeScript, lint, dan test harus lolos.

---

## 1. Layout & navigasi

```
┌─────────────┬──────────────────┬───────────────────────────────────────┐
│ Sidebar app │ Sidebar project  │ ← Semua project                        │
│ (existing)  │                  │ [Nama Project] [Status] [Lead avatar]  │
│             │ ▣ Overview       │ PR260005 · Engineering, Data · OP260012│
│             │ ▦ Board          │ ───────────────────────────────────── │
│             │ ⏱ Sprints        │                                        │
│             │ ◇ Milestones     │        (konten menu aktif)             │
│             │ 📦 Deliverables  │                                        │
│             │ 📝 MOM           │                                        │
│             │ 🗂 Files         │                                        │
│             │ 🤝 Client        │                                        │
│             │ 🔁 Changes       │                                        │
│             │ 📊 Analytics     │                                        │
│             │ 👥 Team          │                                        │
│             │ ⚙ Settings       │                                        │
└─────────────┴──────────────────┴───────────────────────────────────────┘
```

- Buat `web/src/app/(app)/projects/[id]/layout.tsx` berisi header project dan sidebar project. Konten tiap menu di sub-route.
- Header: tombol kembali, nama project, badge status, avatar lead, baris kecil (kode · tim · kode opportunity asal, bisa diklik ke opportunity).
- Menu aktif di-highlight. Di layar kecil (< 768px), sidebar project berubah jadi **tab horizontal yang bisa di-scroll**.
- Menu **Settings** hanya tampil untuk yang boleh mengelola (lihat Bagian 15).
- Akses: jika user tidak boleh melihat project, tampilkan EmptyState "Project tidak ditemukan" (perilaku sekarang dipertahankan).

| Menu | Route |
|---|---|
| Overview | `/projects/[id]` |
| Board | `/projects/[id]/board` |
| Sprints | `/projects/[id]/sprints` |
| Milestones | `/projects/[id]/milestones` |
| Deliverables | `/projects/[id]/deliverables` |
| MOM | `/projects/[id]/mom` dan `/projects/[id]/mom/[momId]` |
| Files | `/projects/[id]/files?tab=notes\|decisions\|links` |
| Client | `/projects/[id]/client` |
| Changes | `/projects/[id]/changes` |
| Analytics | `/projects/[id]/analytics` |
| Team | `/projects/[id]/team` |
| Settings | `/projects/[id]/settings` |

---

## 2. Model data (tambahan)

Tambahkan tipe di `web/src/lib/types.ts` (sesuaikan dengan tipe `Project`/`Task` yang sudah ada; **jangan hapus field lama**).

```ts
// Board: satu project bisa punya banyak board
interface Board { id: string; projectId: string; name: string; order: number }
// BoardColumn yang sudah ada: tambah boardId
// BoardColumn { id, projectId, boardId, name, order, isDone: boolean }

interface Epic  { id: string; projectId: string; title: string; description: string; color: string }
interface Story { id: string; epicId: string; title: string }

// Task (perluas yang sudah ada)
// + boardId, storyId | null, startDate | null, deadline | null,
// + assigneeIds: string[] (multi assignee; migrasikan dari assigneeId),
// + dependsOn: string[] (id task lain), estimateHours: number | null,
// + sprintId | null, blocked: boolean, blockedReason: string | null,
// + comments: TaskComment[], attachments: Attachment[]
interface TaskComment { id: string; authorId: string; body: string; createdAt: string }
interface Attachment  { id: string; name: string; url: string; size: number; uploadedBy: string; uploadedAt: string }

interface Sprint {
  id: string; projectId: string; teamId: string | null; name: string; goal: string;
  startDate: string; endDate: string; status: "planned" | "active" | "completed";
  plannedTaskIds: string[];   // snapshot saat sprint dimulai
}

interface Milestone {
  id: string; projectId: string; name: string; description: string;
  targetDate: string; taskIds: string[]; completedAt: string | null;
}

type DeliverablePhase  = "proposal" | "requirement" | "design" | "build" | "testing" | "final";
type DeliverableStatus = "draft" | "in_progress" | "review" | "sent";
interface Deliverable {
  id: string; projectId: string; title: string; description: string;
  phase: DeliverablePhase; status: DeliverableStatus; deadline: string | null;
  link: string | null; ownerId: string; createdAt: string;
}

interface Mom {
  id: string; projectId: string; title: string; meetingDate: string;
  attendeeIds: string[]; externalAttendees: string[];   // nama tamu/klien
  body: string;                 // markdown
  actionItems: { id: string; text: string; assigneeId: string | null; dueDate: string | null; done: boolean; taskId: string | null }[];
  attachments: Attachment[];
  status: "draft" | "published"; authorId: string; updatedAt: string;
}

interface Note { id: string; projectId: string; title: string; body: string; tags: string[]; authorId: string; updatedAt: string; pinned: boolean }

type DecisionStatus = "proposed" | "accepted" | "rejected" | "superseded" | "deprecated";
interface Decision {
  id: string; projectId: string; number: number;   // DR-001, DR-002 ...
  title: string; context: string; decision: string; consequences: string;
  category: string; status: DecisionStatus; decidedById: string | null; decidedAt: string | null;
  sourceMomId: string | null; supersedesId: string | null;
}

interface ProjectLink { id: string; projectId: string; label: string; url: string; category: string; addedBy: string }

interface ClientTouchpoint {
  id: string; projectId: string; date: string; type: "meeting" | "call" | "email" | "visit" | "presentation";
  summary: string; outcome: string; participantIds: string[]; contactIds: string[];
}
interface ClientKeyAction { id: string; projectId: string; title: string; ownerId: string; dueDate: string | null; status: "open" | "done" }
// Stakeholder klien = company_contacts yang sudah ada di modul Sales (+ field roleInProject: "decision_maker" | "user" | "technical" | "finance" | "other")

type ChangeSource = "client" | "internal";
type ChangeStatus = "submitted" | "under_review" | "approved" | "rejected" | "implemented";
interface ChangeRequest {
  id: string; projectId: string; number: number;   // CR-001
  title: string; description: string; source: ChangeSource; requestedBy: string;  // nama
  requestedAt: string; impactDays: number; impactNote: string; estimateHours: number | null;
  status: ChangeStatus; decidedById: string | null; decidedAt: string | null; linkedTaskIds: string[];
}

interface Baseline { id: string; projectId: string; name: string; createdAt: string; plannedPoints: { date: string; percent: number }[] }

interface ActivityLog {
  id: string; projectId: string; actorId: string; at: string;
  kind: "task_created" | "task_moved" | "task_done" | "comment" | "mom_published" | "deliverable_status" | "milestone_done" | "cr_status" | "member_added" | "sprint_started" | "sprint_completed";
  text: string;           // "Task dipindahkan ke Done"
  targetRef: string | null; // "#17", "CR-002"
}

interface JoinRequest { id: string; projectId: string; userId: string; requestedAt: string }
```

Setiap action di store yang mengubah data project **wajib menambah `ActivityLog`**.

Mock data: isi minimal **2 project** dengan data lengkap di semua menu (3 board, ±30 task, 2 sprint selesai + 1 aktif, 4 milestone, 6 deliverable, 3 MOM, 5 note, 4 decision, 5 link, 6 touchpoint, 3 CR, 1 baseline, ±40 activity log), supaya semua grafik terisi.

---

## 3. Overview

Tujuan: dalam 10 detik orang tahu kondisi project.

Layout 2 kolom (desktop): konten utama kiri, **panel Activity** kanan (lebar ±340px, sticky).

**a. Strip status** (deretan kartu kecil)
| Kartu | Isi |
|---|---|
| Progress | % task di kolom `isDone`, dengan progress bar |
| Berjalan | jumlah task belum selesai |
| Selesai | jumlah task selesai |
| Terlambat | task belum selesai yang deadline < hari ini (merah jika > 0) |
| Tanpa assignee | task belum selesai tanpa assignee |
| Milestone berikut | nama + tanggal milestone terdekat yang belum selesai, atau "Tidak ada" |
| Target selesai | tanggal target project + sisa hari (merah jika lewat) |
| Jam tercatat | total jam timesheet ke kode project ini (ambil dari `timesheet_entries`) |

**b. Perlu perhatian**: daftar task terlambat + task `blocked`, urut paling parah. Tampilkan 5, tombol "Tampilkan semua".

**c. Progress per board**: satu baris per board: nama, bar progress, `x/y task`.

**d. Agenda 14 hari**: gabungan deadline task, target milestone, deadline deliverable, dan akhir sprint dalam 14 hari ke depan, dikelompokkan per tanggal.

**e. Beban tim**: tabel per anggota: avatar + nama, task terbuka, berjalan, terlambat. Baris "Tanpa assignee" di paling bawah.

**f. Register task**: tabel semua task lintas board. Filter: board, status (kolom), assignee. Klik baris → buka detail task.

**g. Panel Activity** (kanan): feed `ActivityLog` terbaru: avatar inisial, nama aktor (tebal), teks, ref (`#17` berwarna, bisa diklik), waktu relatif ("4 bln lalu"). Infinite scroll / tombol "Muat lebih".

Bagian b–f bisa dilipat (collapsible) dengan judul "Ringkasan Lintas Board"; status lipat disimpan di `localStorage`.

---

## 4. Board

**Toolbar**: pemilih board (dropdown + tombol "Board baru"; menu ⋯ untuk rename/hapus board), toggle tampilan **Kanban | List | Gantt**, filter (assignee, prioritas, label, epic, "hanya task saya"), pencarian judul, tombol "+ Task".

**Kanban**
- Kolom milik board aktif. Drag & drop task antar kolom dan ubah urutan dalam kolom.
- Header kolom: nama, jumlah task, menu (rename, ubah warna, tandai "kolom selesai", hapus; hapus kolom berisi task wajib pilih kolom tujuan pemindahan).
- Tombol "+ Kolom" di ujung kanan.
- Kartu task: judul, ID `#nomor`, prioritas (badge), avatar assignee (maks 3 + "+n"), deadline (merah jika lewat), label, ikon subtask `2/5`, ikon komentar, ikon lampiran, penanda blocked.

**List**: tabel task (ID, judul, kolom/status, assignee, prioritas, deadline, label, epic). Kolom bisa diurutkan. Edit cepat status, assignee, dan label langsung di sel.

**Gantt**
- Sumbu waktu (hari/minggu/bulan, bisa di-zoom). Sidebar kiri daftar task dikelompokkan per epic.
- Bar task dari `startDate` ke `deadline`; task tanpa tanggal masuk grup "Belum dijadwalkan".
- Garis panah untuk dependensi (`dependsOn`). Penanda belah ketupat untuk milestone, penanda kecil untuk deadline deliverable. Garis vertikal "hari ini".
- Drag bar untuk geser/ubah durasi (hanya yang boleh edit).

**Panel Epic** (bisa dibuka dari toolbar): daftar epic → story di dalamnya, progress tiap epic. Buat/edit epic dan story.

**Detail task** (sheet/dialog dari kanan, juga dibuka via `?task=<id>`):
- Judul (edit inline), deskripsi (markdown), kolom/status, assignee (multi, searchable), prioritas (Rendah/Sedang/Tinggi/Urgent), label, epic/story, sprint
- Jadwal: tanggal mulai, deadline, estimasi jam
- Subtask (checklist, bisa ditambah/centang/hapus)
- Dependensi: "Bergantung pada" (picker task lain; cegah dependensi melingkar)
- Blocked: toggle + alasan
- Lampiran (simulasi upload: simpan nama file & ukuran)
- Komentar (urut waktu, dengan @mention anggota)
- Riwayat aktivitas task ini
- Tombol hapus (dengan konfirmasi)

---

## 5. Sprints

- Tombol "Sprint baru": nama, tim (opsional; dipilih dari tim project), tujuan, tanggal mulai & selesai.
- **Sprint aktif** (kartu besar di atas): nama, tujuan, sisa hari, progress, dan **Burndown chart** (garis ideal vs sisa task aktual per hari).
- **Daftar sprint** dikelompokkan per tim: badge status, rentang tanggal, jumlah task. Aksi: "Atur task" (dialog pilih task masuk/keluar sprint), "Mulai" (hanya satu sprint aktif per tim), "Selesaikan" (task belum selesai: pilih pindahkan ke sprint berikut atau ke backlog), hapus (hanya sprint planned).
- **Velocity chart**: batang per sprint selesai, jumlah task planned vs completed.

---

## 6. Milestones

- Daftar milestone dalam bentuk **timeline vertikal** urut tanggal: nama, target, deskripsi, progress task tertaut, status (Belum / Selesai / Terlambat).
- Buat/edit/hapus milestone. "Tautkan task" lewat picker multi-select. Tombol "Tandai selesai".
- Milestone otomatis muncul di Gantt dan Agenda Overview.

---

## 7. Deliverables

- Tabel/kartu dikelompokkan per **fase**: Proposal → Requirement → Desain → Build → Testing → Delivery Final.
- Kolom: judul, PIC, status (Draft / Dalam Proses / Review / Terkirim), deadline (merah jika lewat dan belum terkirim), link (buka di tab baru).
- Filter status & fase. Klik → sheet detail untuk edit. Perubahan status masuk Activity.
- Ringkasan di atas: jumlah per status.

---

## 8. MOM (Minutes of Meeting)

- **Daftar**: tabel judul, tanggal meeting, penulis, jumlah action item (selesai/total), status. Pencarian + tab filter **Semua / Draft / Published**. Tombol "MOM baru" (langsung membuat draft dan membuka editor).
- **Editor** (`/mom/[momId]`): judul, tanggal meeting, peserta internal (multi picker) + peserta eksternal (input teks bebas), isi (editor markdown dengan preview), lampiran.
- **Action items**: teks, PIC, due date, centang selesai. Tombol "Jadikan task" → membuat task di board pilihan dan menautkan `taskId`.
- Tombol **Publish** (draft → published; masuk Activity). MOM published masih bisa diedit oleh penulis/lead.
- Tampilan baca: format dokumen rapi, bisa dicetak (print CSS).

---

## 9. Files

Tiga tab (disimpan di query `?tab=`):

**Catatan**: dua panel: daftar note (cari, filter tag, note yang di-pin di atas) | editor markdown note terpilih. Buat, edit, hapus, pin.

**Decision Register**: tabel nomor (`DR-001`), judul, kategori, status (badge warna), diputuskan oleh, tanggal. Form/detail: konteks, keputusan, konsekuensi, kategori, status, diputuskan oleh, tanggal, MoM sumber (picker MOM), menggantikan keputusan (picker decision; otomatis set yang lama jadi `superseded`).

**Tautan**: daftar link dikelompokkan per kategori (Dokumen, Desain, Repo, Lingkungan, Lainnya): label, URL (ikon domain), ditambahkan oleh. Tambah/edit/hapus.

---

## 10. Client

Hanya tampil isinya kalau project punya opportunity/company asal; jika tidak, EmptyState "Project internal, tidak terhubung ke klien."

Header: kartu company (nama, industri, PIC sales, link ke halaman company/opportunity di modul Sales).

Tab:
- **Touchpoints**: timeline interaksi dengan klien: tanggal, tipe (ikon), ringkasan, hasil, peserta internal & kontak klien. Tambah/edit.
- **Key Actions**: daftar tindak lanjut ke klien: judul, PIC, due date, status (checkbox).
- **Stakeholders**: kontak klien dari modul Sales: nama, jabatan, email, telepon, peran di project. Bisa set peran di project.

---

## 11. Changes (Change Request)

- Tabel: nomor `CR-001`, judul, sumber (Klien/Internal), diminta oleh, tanggal, dampak (+n hari), estimasi jam, status. Filter sumber & status, urut per kolom.
- Form "CR baru": judul*, deskripsi*, sumber, diminta oleh*, dampak ke timeline (hari) + catatan dampak, estimasi jam.
- Detail: alur status `Diajukan → Direview → Disetujui / Ditolak → Diimplementasikan`. Hanya lead project atau stakeholder yang boleh setujui/tolak. Saat disetujui: opsi "Buat task dari CR" dan opsi "Geser target selesai project +n hari".
- Ringkasan di atas: total CR, disetujui, total tambahan hari dari CR yang disetujui.

---

## 12. Analytics

- **S-Curve**: grafik garis kumulatif % per minggu: **Planned** (dari baseline terpilih), **Actual** (dari task selesai), **Revised** (planned + dampak CR disetujui). Dropdown pilih baseline. Tombol "Simpan baseline" (snapshot rencana saat ini dari deadline task). Kalau belum ada baseline: EmptyState + tombol buat baseline. Badge **Scope creep** jika jumlah task bertambah > 10% sejak baseline.
- **Sprint report**: pilih sprint → tasks planned, completed, carried over, new added (kartu angka) + tabel CR selama sprint.
- **Distribusi**: task per assignee, per prioritas, per label (bar chart).
- **Jam timesheet**: total jam per minggu dan per orang untuk project ini (dari timesheet).
- Tombol **Generate Report**: halaman ringkasan siap cetak (status, progress, milestone, CR, risiko/terlambat).

Pakai library chart yang sudah ada di project; kalau belum ada, tanya dulu sebelum menambah.

---

## 13. Team

- **Anggota**: tabel avatar, nama, tim, peran di project (Lead / Member / Viewer), tanggal bergabung, jumlah task terbuka. Ubah peran & keluarkan anggota (hanya lead/stakeholder). Tidak bisa mengeluarkan lead terakhir.
- **Tambah anggota**: picker pegawai (searchable, difilter tim pelaksana project, tapi bisa pilih tim lain).
- **Permintaan bergabung**: daftar `JoinRequest` dengan tombol Terima/Tolak.
- **Link undangan**: generate link (simulasi token) dengan masa berlaku (1/7/30 hari) dan tombol salin.

---

## 14. Settings

- **Umum**: nama, deskripsi, tim pelaksana, lead, tanggal mulai, target selesai, status (`Belum Mulai / Ongoing / Review-UAT / Selesai / On Hold / Batal`), warna/ikon project. Kode project read-only.
- **Label/Tag**: kelola label (nama + warna) yang dipakai task.
- **Kolom default board baru**.
- **Tautan cepat**: link yang tampil di header project (maks 3).
- **Danger zone**: arsipkan project; hapus project (ketik nama project untuk konfirmasi; hanya stakeholder).

---

## 15. Hak akses

| Aksi | Viewer / HR / Finance | Member | Lead | Stakeholder |
|---|---|---|---|---|
| Lihat semua menu | ✅ (read-only) | ✅ | ✅ | ✅ |
| Buat/edit task, komentar, note, MOM, link | – | ✅ | ✅ | ✅ |
| Kelola board, kolom, epic, sprint, milestone, deliverable | – | – | ✅ | ✅ |
| Setujui/tolak CR | – | – | ✅ | ✅ |
| Team & Settings | – | – | ✅ | ✅ |
| Hapus project | – | – | – | ✅ |

- Pegawai yang bukan anggota tidak bisa membuka project (kecuali HR/Stakeholder, read-only untuk HR).
- Semua cek akses lewat helper di `web/src/lib/projects.ts` (perluas `canEditProject`, tambah `canManageProject`), bukan tersebar di komponen.
- Mode read-only: sembunyikan tombol aksi, bukan cuma disable.

---

## 16. Urutan pengerjaan

Kerjakan per langkah, pastikan typecheck + lint + test lolos di setiap langkah:

1. Tipe data + mock data + actions store + ActivityLog
2. Layout workspace (header + sidebar project + routing semua menu, isi sementara EmptyState)
3. Board (Kanban + List + detail task), pindahkan isi halaman lama ke sini
4. Overview + panel Activity
5. Milestones, Deliverables
6. Sprints (+ burndown, velocity)
7. MOM, Files (Catatan, Decision, Tautan)
8. Client, Changes
9. Gantt
10. Analytics (S-curve, sprint report, distribusi, jam timesheet, report)
11. Team, Settings, finalisasi hak akses

## 17. Selesai jika

- Semua 12 menu bisa dibuka dan berisi data dummy yang masuk akal.
- Semua aksi CRUD jalan dan tercatat di Activity.
- Hak akses sesuai Bagian 15 (cek dengan login demo sebagai Pegawai non-anggota, Member, Lead, HR, Stakeholder).
- Responsif sampai lebar 375px.
- Unit test untuk: progress project, deteksi terlambat, agenda 14 hari, burndown, velocity, S-curve, dependensi melingkar, nomor otomatis CR/DR.
- `pnpm --dir web typecheck`, `pnpm --dir web lint`, `pnpm --dir web test` lolos.

## Di luar scope

Chat realtime, peta lokasi (site map), integrasi GitHub / Google Chat / kalender, upload file sungguhan (masih simulasi sampai backend Directus ada).
