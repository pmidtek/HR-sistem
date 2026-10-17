# Backend SIDESAH (Directus 11 + PostgreSQL)

Panduan singkat untuk menjalankan dan merawat backend. Semua perintah dijalankan dari folder root repo (`hris-internal/`).

## Kenapa Directus 11.17.4 (bukan 12)?
Directus 12 versi gratis ("Core") dibatasi **25 tabel**, **tanpa login Microsoft (SSO)**, dan maks 3 akun panel admin.
SIDESAH butuh ±50 tabel + login Microsoft, jadi kita kunci di **11.17.4** (keputusan owner, 17 Okt 2026).
Konsekuensi: tidak dapat update keamanan versi 12 ke atas. Nanti bisa ditinjau ulang (mis. daftar *Directus Open Innovation Grant* kalau memenuhi syarat, lalu naik ke v12).

## Menjalankan pertama kali (lokal)
```bash
cp .env.example .env            # lalu isi semua nilai "ganti-..." (lihat komentar di file)
docker compose up -d --build    # jalankan Postgres + Directus (extension ikut di-build otomatis)
pnpm --dir directus install     # sekali saja
pnpm --dir directus bootstrap -- --demo   # skema + hak akses + master data + akun demo
cp web/.env.example web/.env.local   # sekali saja (setting frontend)
pnpm --dir web dev              # frontend → http://localhost:3000
```
- Panel admin Directus: **http://localhost:3000/panel** (login pakai `ADMIN_EMAIL` / `ADMIN_PASSWORD` dari `.env`).
- Akun demo (hanya lokal): email dari data dummy, mis. `budi@perusahaan.co.id`, password `demo12345`.
- Di server produksi jalankan **tanpa** `--demo`: `pnpm --dir directus bootstrap`.

> Catatan: email admin jangan berakhiran `.local` (ditolak validasi Directus).

## Frontend ↔ backend (status 17 Okt 2026)
- Modul yang dirilis (**Reimburse, Dashboard, Approvals, Employees, Settings**) sudah memakai data asli dari backend.
  Modul lain masih "Coming soon" dan datanya kosong di mode backend.
- Login: email + password (cookie sesi Directus, berlaku 7 hari; "Remember me" tidak dicentang = keluar saat browser ditutup).
  Tombol **Continue with Microsoft** otomatis aktif begitu SSO diatur di `.env` server.
- Mode data diatur di `web/.env.local`: `NEXT_PUBLIC_DATA_SOURCE=directus` (asli) atau `mock` (dummy, tanpa backend).
- **Notifikasi realtime** lewat WebSocket `/panel/websocket`: notifikasi baru langsung muncul (toast + lonceng), dan daftar klaim/rekening
  ikut berubah saat orang lain menyetujui/membayar, tanpa refresh.
- **File**: diupload langsung saat dipilih (bisa banyak sekaligus), disimpan di volume Docker `uploads`, dikelompokkan per folder:
  `Reimbursement receipts`, `Reimbursement payment proofs`, `Company assets`. Dibuka lewat `/panel/assets/<id>` dengan aturan akses:
  pengunggah, pemilik klaim, PIC (untuk struk external), dan Finance/HR/Stakeholder. Orang lain ditolak.

## Struktur
| Folder / file | Isi |
|---|---|
| `schema/*.ts` | **Definisi semua tabel** (sumber kebenaran). `core` (pegawai, tim, rekening, pengaturan, notifikasi, log), `reimburse`, `hr` (timesheet, cuti, lembur, payroll), `projects` (sales + project workspace) |
| `access/roles.ts` | 5 role (Stakeholder, HR, Finance, Employee, External) dengan **ID tetap** |
| `access/permissions.ts` | Siapa boleh baca/ubah apa |
| `scripts/` | `bootstrap` (semua), `schema:apply`, `access:apply`, `seed`, `seed:demo` |
| `extensions/sidesah/` | **Logic bisnis** (endpoint `/sidesah/*` + hook). Memakai ulang `web/src/lib/calc` |
| `snapshots/schema.yaml` | Hasil `directus schema snapshot` untuk di-review di Git |
| `Dockerfile` | Image Directus + extension yang sudah di-build |

## Mengubah skema ("migrasi")
1. Tambah/ubah tabel atau kolom di `schema/*.ts`.
2. `pnpm --dir directus schema:apply` → yang belum ada dibuat. **Tidak pernah menghapus data atau kolom.**
   Kalau tipe kolom berubah, script hanya memberi peringatan; migrasi seperti itu dikerjakan manual (backup dulu).
3. `pnpm --dir directus snapshot` → perbarui `snapshots/schema.yaml`, lalu commit.

Backup sebelum perubahan besar:
```bash
docker compose exec postgres pg_dump -U directus directus > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Aturan penting yang dijaga server
- Status pengajuan **tidak bisa** diubah langsung lewat API (permission read-only). Hanya lewat endpoint di bawah, dan setiap perubahan tercatat di `approval_logs`.
- Tidak ada yang bisa menyetujui / membayar pengajuan sendiri.
- Pegawai hanya melihat data miliknya; PIC melihat pengajuan external yang dia pegang.
- Nomor rekening utuh hanya terlihat oleh pemilik & Finance (HR/Stakeholder melihat 4 digit terakhir).
- File struk diberi sidik jari SHA-256 otomatis (deteksi struk yang dipakai dua kali).
- External yang masa aksesnya habis tidak bisa login dan dinonaktifkan otomatis tiap malam.

## Endpoint (dipanggil frontend lewat `/panel/sidesah/...`)
| Method & path | Fungsi | Siapa |
|---|---|---|
| `GET /sidesah/me` | Profil + role aplikasi | semua |
| `POST /sidesah/reimbursements` | Ajukan reimburse `{ title, items: [{ date, description, categoryId, projectCode, amountUsdCents, amount, fileIds }] }` | pegawai, external |
| `POST /sidesah/reimbursements/:id/resubmit` | Perbaiki & kirim ulang (body sama) | pemilik, saat "revision" |
| `POST /sidesah/reimbursements/:id/action` | `{ action: confirm \| forward \| revision \| reject \| approve, note }` | PIC / Finance / Stakeholder sesuai tahap |
| `POST /sidesah/reimbursements/:id/items/:itemId/decline` | Tolak satu baris `{ note }` (`note: null` = pulihkan) | peninjau di tahapnya |
| `POST /sidesah/reimbursements/pay` | `{ ids, date, method: transfer \| payroll, reference, proofFileIds }` | Finance, HR, Stakeholder |
| `GET /sidesah/reimbursements/:id/risk` | Tanda risiko anti-fraud | peninjau |
| `PUT /sidesah/bank-accounts/:userId` | Simpan rekening (jadi "belum diverifikasi") | pemilik, HR, Finance |
| `POST /sidesah/bank-accounts/:userId/verify` | Verifikasi rekening | Finance (bukan milik sendiri) |
| `POST /sidesah/notifications/read-all` | Tandai semua notifikasi dibaca | semua |
| `POST /sidesah/sync/microsoft` | Jalankan sinkron akun Microsoft sekarang | HR, Stakeholder |
| `POST /sidesah/users` · `PATCH /sidesah/users/:id` | Tambah / ubah pegawai & external (kode EMP/EXT otomatis, password awal) | HR, Finance, Stakeholder |

Upload file (struk/bukti transfer): `POST /panel/files` (bawaan Directus), lalu kirim `id`-nya di `fileIds` / `proofFileIds`.
Membaca data (daftar klaim, kategori, notifikasi, dll.): API bawaan Directus `/panel/items/<tabel>`, sudah dibatasi permission.

Modul lain (timesheet, cuti, lembur, payroll, project) **tabel & hak bacanya sudah siap**; endpoint penulisannya dibuat saat modul itu dirilis.

## Login Microsoft & sinkron akun Outlook
Butuh admin Microsoft 365 kantor (IT) untuk membuat **App Registration** di https://entra.microsoft.com:
1. *App registrations → New registration*. Nama: `SIDESAH`. Redirect URI (Web): `https://DOMAIN/panel/auth/login/microsoft/callback`
   (lokal: `http://localhost:3000/panel/auth/login/microsoft/callback`).
2. Catat **Application (client) ID** dan **Directory (tenant) ID**. Buat **Client secret** (*Certificates & secrets*).
3. *Token configuration → Add optional claim → ID → `email`*.
4. Untuk sinkron akun: *API permissions → Microsoft Graph → Application → `User.Read.All` + `GroupMember.Read.All` → Grant admin consent*.
5. (Opsional, untuk role otomatis) buat grup keamanan: `SIDESAH Stakeholder`, `SIDESAH HR`, `SIDESAH Finance`, dan (opsional) `SIDESAH Staff`. Catat Object ID-nya.
6. Isi `.env`:
   ```
   AUTH_PROVIDERS=microsoft
   AUTH_MICROSOFT_CLIENT_ID=...        AUTH_MICROSOFT_CLIENT_SECRET=...
   AUTH_MICROSOFT_ISSUER_URL="https://login.microsoftonline.com/<TENANT_ID>/v2.0/.well-known/openid-configuration"
   MS_SYNC_ENABLED=true  MS_TENANT_ID=...  MS_CLIENT_ID=...  MS_CLIENT_SECRET=...   (boleh pakai app yang sama)
   MS_GROUP_STAKEHOLDER=...  MS_GROUP_HR=...  MS_GROUP_FINANCE=...  MS_GROUP_ALL_STAFF=...
   ```
7. `docker compose up -d` lalu (sebagai HR) jalankan sinkron pertama: `POST /panel/sidesah/sync/microsoft`. Setelah itu otomatis tiap hari jam 06:00.

Cara kerja role: anggota grup Stakeholder → Stakeholder, Finance → Finance, HR → HR, lainnya → Employee.
Kalau grup role tidak diisi, role diatur manual oleh HR di halaman Employees. External (freelance) tetap login pakai email + password.
Pegawai yang dinonaktifkan di Microsoft otomatis dinonaktifkan juga di SIDESAH saat sinkron.
