# CLAUDE.md

Sistem HRIS internal: timesheet, lembur, cuti, reimburse, payroll + slip gaji, sales pipeline, project board.
**Spesifikasi lengkap ada di `BRIEF.md`. Baca dulu sebelum mengerjakan apa pun.**

## Status
- **Frontend dikerjakan lebih dulu** (atas permintaan owner, 05 Okt 2026): semua halaman sudah ada di `web/` dengan **data dummy** di memori browser (`web/src/lib/mock/`, `web/src/store/`). Belum ada backend.
- Logic murni di `web/src/lib/calc/` (lembur, cuti, timesheet, approval, payroll) sudah ber-unit test. Saat backend dibuat, pindahkan/pakai ulang logic ini di Directus Extensions; `web/src/store/actions*.ts` adalah simulasi custom endpoint yang nanti diganti panggilan API.
- Login nanti pakai **Microsoft kantor (Entra ID)**. Sekarang login demo (pilih akun).
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
│   ├── extensions/           # hooks & endpoints (logic bisnis)
│   ├── snapshots/            # hasil `directus schema snapshot` (YAML)
│   └── seed/                 # script seed data dummy & master data
└── web/                      # Next.js app
```

## Aturan wajib
- Semua aturan bisnis (validasi, hitung lembur, potong saldo cuti, payroll, transisi status) **dijalankan di server**. Frontend hanya menampilkan dan mengirim input.
- Status approval hanya berubah lewat **custom endpoint** dan setiap transisi dicatat ke `approval_logs`. Field `status` read-only di permission semua role.
- Tidak ada yang boleh meng-approve pengajuannya sendiri.
- Setiap perubahan skema: jalankan `directus schema snapshot` dan commit file YAML-nya.
- Tarif BPJS, tabel PPh 21 TER, jam kerja normal, mode lembur, dan periode payroll **disimpan di database (CMS)**, jangan di-hardcode.
- Logic perhitungan (lembur, saldo cuti, payroll, PPh 21) wajib punya **unit test** dengan kasus contoh.
- TypeScript dan lint harus lolos tanpa error. Jangan pakai `any` atau mematikan rule untuk mengakali error.
- Jangan commit file `.env` atau kredensial apa pun.
- **Jangan pernah** menjalankan perintah yang menghapus data database (drop/reset) tanpa izin eksplisit. Sebelum perubahan skema besar, backup dulu:
  ```bash
  docker compose exec postgres pg_dump -U directus directus > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

## Konvensi
- Bahasa UI: **Bahasa Indonesia**. Kode, nama variabel, dan nama koleksi: **English** (`leave_requests`, `overtime_requests`).
- Format tampilan: tanggal `DD MMM YYYY`, uang `Rp1.250.000`.
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
# docker compose up -d        → jalankan Directus + Postgres (setelah backend dibuat)
```
