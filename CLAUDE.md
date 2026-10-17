# CLAUDE.md

Sistem HRIS internal: timesheet, lembur, cuti, reimburse, payroll + slip gaji, sales pipeline, project board.
**Spesifikasi lengkap ada di `BRIEF.md`. Baca dulu sebelum mengerjakan apa pun.**

## Status
- **Frontend dikerjakan lebih dulu** (atas permintaan owner, 05 Okt 2026): semua halaman sudah ada di `web/` dengan **data dummy** di memori browser (`web/src/lib/mock/`, `web/src/store/`).
- **Backend dibuat 17 Okt 2026** di `directus/` (panduan: `directus/README.md`). **Directus dikunci di 11.17.4**: v12 gratis dibatasi 25 tabel & tanpa SSO (keputusan owner). Skema = kode di `directus/schema/*.ts` (diterapkan `pnpm --dir directus schema:apply`, hanya menambah). Role dengan ID tetap di `directus/access/roles.ts`. Endpoint reimburse/rekening/notifikasi/sinkron Microsoft di `directus/extensions/sidesah` (memakai ulang `web/src/lib/calc`). Modul lain: tabel & permission baca siap, endpoint tulis menyusul saat modul dirilis.
- **Frontend tersambung ke backend (17 Okt 2026)** untuk modul yang dirilis (Reimburse, Dashboard, Approvals, Employees, Settings). Lapisan API di `web/src/lib/api/` (client, mappers ber-test, load, mutations, realtime WebSocket). Semua aksi komponen lewat `useOps()` (`web/src/store/ops.ts`) yang memilih API (mode backend) atau fungsi murni store (mode `NEXT_PUBLIC_DATA_SOURCE=mock`). Sesi & realtime di `web/src/store/backend-session.ts`. ID role/folder di `web/src/lib/api/ids.ts` wajib sama dengan `directus/access/` (dicek test).
- Directus dibuka lewat **`/panel`** (permintaan owner): Next.js mem-proxy `/panel/*` ke Directus (`web/next.config.ts`), `PUBLIC_URL` = `<domain>/panel`.
- Logic murni di `web/src/lib/calc/` (lembur, cuti, timesheet, approval, payroll) sudah ber-unit test. Saat backend dibuat, pindahkan/pakai ulang logic ini di Directus Extensions; `web/src/store/actions*.ts` adalah simulasi custom endpoint yang nanti diganti panggilan API.
- Login nanti pakai **Microsoft kantor (Entra ID)**. Sekarang login demo (pilih akun).
- **Modul Sales Pipeline ditunda** (13 Okt 2026). Data company/opportunity tetap ada untuk menu Client project; halaman `/sales` diarahkan ke `/projects`.
- **Project Workspace** (12 menu) mengikuti `docs/PROJECT-WORKSPACE.md` dan sudah selesai di frontend. Hak akses project terpusat di `web/src/lib/projects.ts`.
- Grafik dibuat sendiri dengan SVG (`web/src/components/charts/`); warna seri memakai token `--chart-1..3` yang sudah divalidasi (CVD & kontras). Markdown memakai `react-markdown`.
- **Rilis bertahap** (15 Okt 2026): modul yang sudah dirilis diatur di `releasedFeatures` (`web/src/lib/access.ts`). Saat ini baru Dashboard + Reimburse (+ Approvals, Employees, Settings). Modul lain tampil di menu dengan label "Soon" dan halamannya "Coming soon".
- **External (freelance/vendor)** (16 Okt 2026): role `external`, hanya akses Reimburse; wajib punya PIC internal & batas akses. Alur: PIC konfirmasi → Finance → Stakeholder → dibayar. Rekening bank wajib diverifikasi Finance sebelum transfer; tanda anti-fraud di `web/src/lib/calc/reimburse-risk.ts`.
- Nama aplikasi: **SIDESAH** (Sistem Informasi Data Elektronik Slip & Absensi Harian), "by IDTEK". Nama & kepanjangan ada di `web/src/components/brand/logos.tsx` (`APP_NAME`, `APP_FULL_NAME`). Ikon IDTEK ada di `web/public/brand/idtek-icon.png` dan `web/src/app/icon.png` (favicon).
- Desain mengikuti **Cartogram Design System** (token di `web/src/styles/tokens.css`, komponen di `web/src/components/ui/`).

## Cara kerja
- Kerjakan **per fase** sesuai `BRIEF.md` Bagian 14. Jangan lompat fase tanpa diminta.
- Sebelum mulai satu fase, tulis rencana singkat (file yang akan dibuat, skema yang berubah) dan minta konfirmasi.
- Kalau menemukan hal di "Keputusan yang Masih Terbuka" (`BRIEF.md` Bagian 12), **tanya dulu**, jangan berasumsi.
- Owner bukan engineer senior. Jelaskan langkah dan perintah dengan bahasa sederhana (Bahasa Indonesia), dan sertakan perintah yang bisa langsung dijalankan.

## Stack
- **Backend/CMS:** Directus (Docker) + PostgreSQL
- **Logic bisnis:** Directus Extensions (TypeScript), letakkan di `directus/extensions/`
- **Frontend:** Next.js (App Router, TypeScript strict) + Tailwind + shadcn/ui + Directus SDK, letakkan di `web/`
- **Package manager:** pnpm
- **Zona waktu:** Asia/Jakarta. **Uang:** integer Rupiah, jangan pakai float.

## Struktur repo (target)
```
/
├── BRIEF.md
├── CLAUDE.md
├── docker-compose.yml        # directus + postgres (dev)
├── .env.example
├── directus/
│   ├── schema/               # definisi tabel sebagai kode (sumber kebenaran)
│   ├── access/               # role (ID tetap) & permission
│   ├── scripts/              # bootstrap, schema:apply, access:apply, seed
│   ├── extensions/sidesah/   # hooks & endpoints (logic bisnis)
│   └── snapshots/            # hasil `directus schema snapshot` (YAML)
└── web/                      # Next.js app
```

## Aturan wajib
- Semua aturan bisnis (validasi, hitung lembur, potong saldo cuti, payroll, transisi status) **dijalankan di server**. Frontend hanya menampilkan dan mengirim input.
- Status approval hanya berubah lewat **custom endpoint** dan setiap transisi dicatat ke `approval_logs`. Field `status` read-only di permission semua role.
- Tidak ada yang boleh meng-approve pengajuannya sendiri.
- Setiap perubahan skema: ubah `directus/schema/*.ts`, jalankan `pnpm --dir directus schema:apply` lalu `pnpm --dir directus snapshot`, dan commit file YAML-nya.
- Jangan beri nama script npm `setup` (bentrok dengan perintah bawaan `pnpm setup` yang mengubah ~/.zshrc).
- Tarif BPJS, tabel PPh 21 TER, jam kerja normal, mode lembur, dan periode payroll **disimpan di database (CMS)**, jangan di-hardcode.
- Logic perhitungan (lembur, saldo cuti, payroll, PPh 21) wajib punya **unit test** dengan kasus contoh.
- TypeScript dan lint harus lolos tanpa error. Jangan pakai `any` atau mematikan rule untuk mengakali error.
- Jangan commit file `.env` atau kredensial apa pun.
- **Jangan pernah** menjalankan perintah yang menghapus data database (drop/reset) tanpa izin eksplisit. Sebelum perubahan skema besar, backup dulu:
  ```bash
  docker compose exec postgres pg_dump -U directus directus > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

## Konvensi
- Bahasa UI: **English** (permintaan owner, 15 Okt 2026). Kode, nama variabel, dan nama koleksi: **English** (`leave_requests`, `overtime_requests`). Komentar kode dan penjelasan ke owner tetap Bahasa Indonesia.
- Format tampilan: tanggal `DD MMM YYYY` (bulan bahasa Inggris, mis. `07 Oct 2026`), uang `Rp1.250.000`.
- Picker untuk daftar yang terus bertambah (pegawai, project, company) wajib **searchable**.
- Ukuran file: komponen React ≤ 250 baris, extension endpoint/hook ≤ 300 baris. Pecah kalau lebih.

## Prasyarat lokal
Docker Desktop · Node.js 22 LTS · pnpm · Git

## Perintah
```bash
pnpm --dir web install        # sekali saja, pasang dependency
pnpm --dir web dev            # jalankan frontend → http://localhost:3000
pnpm --dir web test           # unit test logic perhitungan
pnpm --dir web typecheck      # cek TypeScript
pnpm --dir web lint           # cek lint
docker compose up -d --build  # jalankan Postgres + Directus (+ build extension)
pnpm --dir directus bootstrap # skema + permission + master data (tambah -- --demo untuk akun demo, lokal saja)
pnpm --dir directus snapshot  # perbarui directus/snapshots/schema.yaml setelah ubah skema
pnpm --dir directus/extensions/sidesah typecheck   # cek TypeScript extension
```
