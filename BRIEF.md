# BRIEF — Sistem HRIS Internal

> Dokumen ini adalah brief lengkap untuk membangun sistem dari nol.
> Baca seluruhnya sebelum mulai. Kalau ada yang ambigu, tanya dulu, jangan berasumsi.

---

## 1. Ringkasan

Aplikasi web internal untuk perusahaan, dipakai oleh **stakeholder internal** dan **pegawai**.

Fungsi utama:
1. **Timesheet** (pengganti absensi): pegawai mencatat per jam ngerjain apa, di project apa.
2. **Lembur**: dihitung otomatis dari timesheet, lalu diajukan dan di-approve.
3. **Cuti**: pengajuan, approval, dan saldo cuti.
4. **Reimburse**: pegawai upload bukti (foto, tanggal, total), di-review Finance, di-approve Stakeholder.
5. **Payroll + Slip Gaji**: gaji bulanan dihitung otomatis (gaji pokok + lembur − potongan), di-approve Stakeholder, dan slip gaji di-generate otomatis.
6. **Sales Pipeline**: daftar company dan opportunity.
7. **Project Board**: opportunity yang sudah deal dijadikan project secara manual, lalu dikerjakan tim delivery (Produk / Data / Engineering) pakai kanban.
8. **Dashboard Stakeholder**: ringkasan seluruh perusahaan.
9. **CMS / Pengaturan**: master data diatur lewat admin panel, tanpa harus ubah kode.

**Tidak ada** absensi check-in/check-out, GPS, maupun fingerprint.

---

## 2. Role & Hak Akses

Ada 4 role. Pegawai juga punya atribut **Tim**.

| Role | Deskripsi |
|---|---|
| **Stakeholder** | Akun tertinggi. Melihat semua data. Pemberi keputusan akhir (approve/reject) untuk cuti, lembur, reimburse, dan payroll. |
| **HR** | Kelola data pegawai, kuota cuti, kalender libur, kode activity. Review pertama cuti & lembur. Rekap timesheet. |
| **Finance** | Review pertama reimburse. Menyiapkan payroll bulanan. Menandai reimburse & gaji sudah dibayar. |
| **Pegawai** | Isi timesheet, ajukan cuti/lembur/reimburse, lihat slip gaji sendiri. Akses modul sesuai tim. |

### Tim (atribut pegawai, bisa diatur di CMS)
- **Sales**: akses modul Sales Pipeline.
- **Produk**, **Data**, **Engineering** (dan tim delivery lain yang bisa ditambah lewat CMS): akses Project Board.

Satu user punya **satu role**. HR, Finance, dan Stakeholder juga tetap bisa isi timesheet, ajukan cuti, dan reimburse untuk dirinya sendiri, sama seperti pegawai.

### Matriks akses ringkas

| Fitur | Pegawai | HR | Finance | Stakeholder |
|---|---|---|---|---|
| Timesheet sendiri | CRUD | CRUD | CRUD | CRUD |
| Timesheet semua orang | – | Lihat | Lihat | Lihat |
| Cuti/lembur: ajukan | ✅ | ✅ | ✅ | ✅ |
| Cuti/lembur: review tahap 1 | – | ✅ | – | – |
| Cuti/lembur: keputusan akhir | – | – | – | ✅ |
| Reimburse: ajukan | ✅ | ✅ | ✅ | ✅ |
| Reimburse: review tahap 1 | – | – | ✅ | – |
| Reimburse: keputusan akhir | – | – | – | ✅ |
| Reimburse: tandai dibayar | – | – | ✅ | – |
| Payroll: siapkan | – | – | ✅ | – |
| Payroll: approve | – | – | – | ✅ |
| Slip gaji sendiri | Lihat/Unduh | Lihat/Unduh | Lihat/Unduh | Lihat/Unduh |
| Data gaji semua orang | – | – | ✅ | ✅ |
| Sales Pipeline | Tim Sales | Lihat | – | Lihat |
| Project Board | Tim delivery (project yang di-assign) | Lihat | – | Lihat |
| Data pegawai | Profil sendiri | CRUD | Lihat | Lihat |
| Master data (CMS) | – | ✅ (HR) | ✅ (Finance) | ✅ |

**Aturan penting:** tidak ada yang boleh meng-approve pengajuannya sendiri. Kalau Stakeholder mengajukan cuti, keputusan akhirnya diambil oleh Stakeholder lain. Kalau Stakeholder cuma ada satu, pengajuan tersebut dianggap disetujui setelah HR approve. *(Perlu dikonfirmasi; lihat Bagian 12.)*

---

## 3. Timesheet

Timesheet menggantikan absensi. Pegawai mencatat pekerjaannya per blok waktu.

### Isi satu entri timesheet
| Field | Wajib | Keterangan |
|---|---|---|
| Tanggal | ✅ | |
| Kode Project | ✅ | Pilih dari opportunity/project aktif, atau **"Internal / Non-project"** |
| Activity | ✅ | Pilih dari daftar Activity Code (diatur HR di CMS), contoh: Meeting, Development, Riset, Admin |
| Jam mulai | ✅ | Kelipatan 15 menit (contoh 09:00, 09:15) |
| Jam selesai | ✅ | Kelipatan 15 menit, harus setelah jam mulai |
| Deskripsi pekerjaan | ✅ | Teks bebas, detail apa yang dikerjakan |

### Aturan
- Entri di hari yang sama **tidak boleh tumpang tindih** jamnya.
- Tidak boleh mengisi timesheet di tanggal cuti yang sudah disetujui.
- Entri yang sudah masuk pengajuan lembur yang disetujui **terkunci** (tidak bisa diedit/dihapus).
- Entri bisa diisi untuk tanggal mundur. Batasnya diatur di CMS, default 7 hari ke belakang.

### Kode Project
- Setiap **opportunity** otomatis mendapat kode `OPYYXXXX` (contoh: `OP260012`).
- Setiap **project** delivery otomatis mendapat kode `PRYYXXXX` (contoh: `PR260005`).
- Ada satu kode tetap `INTERNAL` untuk pekerjaan non-project.
- Di picker, tampilan kode: `KODE — Nama`. Picker bisa dicari (searchable).
- Tim Sales biasanya mencatat jam ke kode OP, sedangkan tim delivery ke kode PR.

### Tampilan
- **Mingguan** (default): grid hari × entri, total jam per hari, penanda hari libur/cuti.
- **Harian**: timeline jam, kelihatan jam yang kosong dan yang terisi.
- Rekap bulanan: total jam normal, total jam lembur, jam per project.

### Rekap untuk HR & Stakeholder
- Matriks pegawai × tanggal per bulan (total jam per hari).
- Filter: tim, project, activity, periode.
- Jam per project (berguna untuk tahu effort tiap project).
- Penanda pegawai yang total jam normalnya kurang dari target bulanan.

---

## 4. Lembur

### Perhitungan otomatis
- **Jam kerja normal per hari** diatur di CMS (default **8 jam**).
- Jam yang melebihi batas itu di hari yang sama otomatis dihitung **jam lembur**. Urutannya berdasarkan jam mulai entri.
- Kerja di hari Sabtu/Minggu/libur nasional: **seluruh jamnya** dihitung lembur hari libur.

### Alur pengajuan
1. Pegawai melihat hari-hari yang punya jam lembur di timesheet-nya.
2. Pegawai mengajukan lembur **per hari** dengan alasan (opsional).
3. Status: **Menunggu Review HR**
4. HR review:
   - Tolak → **Ditolak** (selesai, pegawai dapat notifikasi)
   - Teruskan → **Menunggu Keputusan Stakeholder**
5. Stakeholder memutuskan:
   - **Disetujui** → jam lembur masuk ke payroll periode tersebut
   - **Ditolak**
6. Pegawai mendapat notifikasi hasil akhir.

Pegawai selalu bisa melihat status pengajuannya: *Menunggu Review HR*, *Diteruskan ke Stakeholder*, *Disetujui*, atau *Ditolak*, beserta catatan dari reviewer.

HR dan Stakeholder bisa **mengubah jumlah jam** yang disetujui (misalnya pegawai mengajukan 3 jam, tapi yang disetujui 2 jam). Perubahan ini wajib disertai catatan.

---

## 5. Cuti

### Jenis cuti (diatur di CMS)
| Jenis | Kuota default | Potong saldo? |
|---|---|---|
| Cuti Tahunan | 12 hari kerja / tahun | ✅ |
| Sakit | tanpa batas (wajib lampiran surat dokter jika > 1 hari) | ❌ |
| Izin Khusus (menikah, duka, melahirkan, dll) | sesuai jenis | ❌ |
| Cuti Tanpa Gaji | tanpa batas | ❌, tapi **memotong gaji** |

HR bisa menambah atau mengubah jenis cuti dan kuotanya di CMS. HR juga bisa mengubah saldo cuti per pegawai.

### Aturan
- Hari yang dihitung hanya **hari kerja**. Sabtu, Minggu, dan libur nasional di kalender libur tidak dihitung.
- Pengajuan berupa rentang tanggal. Opsi setengah hari: *nice to have*, bukan MVP.
- Saldo tidak boleh minus.
- Pegawai bisa membatalkan pengajuan selama belum ada keputusan akhir. Cuti yang sudah disetujui bisa dibatalkan sebelum tanggal mulai, dan saldonya dikembalikan.

### Alur pengajuan
Sama seperti lembur:
**Pegawai → HR (review/teruskan atau tolak) → Stakeholder (setuju/tolak) → notifikasi ke pegawai.**

### Dashboard cuti (HR & Stakeholder)
- Siapa yang cuti hari ini / minggu ini.
- Per pegawai: kuota, terpakai, sisa.
- Daftar pegawai yang **belum ambil cuti sama sekali** tahun ini.
- Daftar pegawai dengan sisa cuti banyak menjelang akhir tahun.

---

## 6. Reimburse

### Isi pengajuan
| Field | Wajib |
|---|---|
| Tanggal transaksi | ✅ |
| Kategori (Transport, Makan/Meeting, Hotel, Operasional, dll; diatur Finance di CMS) | ✅ |
| Kode Project (atau Internal) | ✅ |
| Total (Rupiah) | ✅ |
| Keterangan | ✅ |
| Foto/bukti (gambar atau PDF, bisa lebih dari 1) | ✅ minimal 1 |

### Alur
1. Pegawai submit → **Menunggu Review Finance**
2. Finance review (cek foto, tanggal, nominal):
   - Tolak / Minta Revisi → pegawai dapat notifikasi, bisa diperbaiki lalu submit ulang
   - Teruskan → **Menunggu Keputusan Stakeholder**
3. Stakeholder: **Disetujui** atau **Ditolak**
4. Finance menandai **Sudah Dibayar** (isi tanggal bayar; bukti transfer opsional)
   - Opsi: reimburse yang disetujui bisa ikut dibayarkan lewat payroll bulan berjalan (masuk komponen slip). Pengaturannya ada di CMS.

### Tampilan
- Pegawai: daftar reimburse sendiri beserta status.
- Finance: antrian review, filter per status/kategori/project/periode, total per kategori per bulan.
- Stakeholder: antrian keputusan (cukup klik Setuju/Tolak, dengan foto bisa dibuka langsung), plus rekap total reimburse per bulan, per kategori, per project.

---

## 7. Payroll & Slip Gaji

### Data gaji per pegawai (diisi Finance)
- Gaji pokok
- Tunjangan tetap (bisa lebih dari satu: transport, makan, jabatan, dll)
- Status PTKP (TK/0, K/1, dst.) untuk PPh 21
- NPWP (opsional)
- Kepesertaan BPJS Kesehatan & BPJS Ketenagakerjaan (ya/tidak)
- Rekening bank (nama bank, nomor, atas nama)

Riwayat perubahan gaji disimpan (tanggal berlaku), jadi payroll bulan lalu tidak berubah kalau gaji naik.

### Komponen gaji bulanan (dihitung otomatis)

**Pendapatan**
- Gaji pokok
- Tunjangan tetap
- **Uang lembur**: dari jam lembur yang **disetujui** di periode tersebut
- Reimburse (jika opsi "bayar lewat payroll" aktif)
- Pendapatan lain (input manual Finance: bonus, THR, insentif)

**Potongan**
- BPJS Kesehatan (porsi karyawan)
- BPJS Ketenagakerjaan: JHT & JP (porsi karyawan)
- PPh 21
- Potongan cuti tanpa gaji: (gaji pokok ÷ jumlah hari kerja periode) × hari cuti tanpa gaji
- Potongan lain (input manual Finance: kasbon, dll)

**Take home pay = total pendapatan − total potongan**

### Rumus lembur (bisa dipilih di CMS)
1. **Mode Depnaker** (default):
   - Upah per jam = 1/173 × (gaji pokok + tunjangan tetap)
   - Hari kerja: jam ke-1 × 1,5; jam ke-2 dan seterusnya × 2
   - Hari libur (5 hari kerja/minggu): jam ke-1 s/d 8 × 2; jam ke-9 × 3; jam ke-10 s/d 12 × 4
2. **Mode Flat**: tarif tetap per jam (bisa diatur per pegawai atau global)

### Tarif BPJS & PPh 21
- Semua persentase dan batas upah BPJS **disimpan di CMS**, jangan di-hardcode, karena berubah tiap tahun. Seed awal:
  - BPJS Kesehatan: karyawan 1%, perusahaan 4%, batas upah Rp12.000.000
  - JHT: karyawan 2%, perusahaan 3,7%
  - JP: karyawan 1%, perusahaan 2%, batas upah diatur di CMS (update tiap tahun)
  - JKK (0,24%) & JKM (0,3%): ditanggung perusahaan
- PPh 21 memakai metode **TER bulanan** (PP 58/2023). Tabel TER kategori A/B/C disimpan di CMS. Bulan Desember dihitung ulang setahun penuh.
- Porsi perusahaan ditampilkan di laporan payroll, tapi **tidak** memotong take home pay.
- **Rumus pajak dan BPJS wajib diverifikasi oleh Finance atau konsultan pajak sebelum go-live.**

### Periode
- Periode payroll diatur di CMS: **bulan kalender** (tgl 1 s/d akhir bulan) atau **cutoff** (contoh tgl 26 bulan lalu s/d tgl 25 bulan ini).
- Lembur, cuti tanpa gaji, dan reimburse diambil sesuai periode yang dipilih.

### Alur payroll bulanan
1. Finance klik **Generate Payroll** untuk periode tertentu. Sistem membuat draf untuk semua pegawai aktif dengan semua komponen terisi otomatis.
2. Finance review dan bisa menambah input manual (bonus, potongan lain). Status: **Draf**.
3. Finance **Ajukan ke Stakeholder**. Status: **Menunggu Approval**.
4. Stakeholder melihat ringkasan (total gaji, total lembur, total potongan, per pegawai, perbandingan dengan bulan lalu), lalu **Setuju** atau **Kembalikan dengan catatan**.
5. Setelah disetujui:
   - **Slip gaji PDF** di-generate untuk setiap pegawai
   - Pegawai bisa melihat dan mengunduh slip di aplikasi, plus notifikasi email
   - Data payroll periode itu **terkunci**
6. Finance menandai **Sudah Ditransfer**.

Ekspor: rekap payroll ke Excel (untuk transfer bank dan arsip).

### Template Slip Gaji

Ukuran A4 portrait, satu halaman, bisa dicetak dan diunduh PDF. Ada watermark "RAHASIA" samar di latar.

```
┌──────────────────────────────────────────────────────────────┐
│ [LOGO]  PT NAMA PERUSAHAAN                    SLIP GAJI       │
│         Alamat perusahaan                     Periode: Okt 2026│
│                                               26 Sep – 25 Okt │
├──────────────────────────────────────────────────────────────┤
│ Nama        : Budi Santoso         No. Slip : SG/2026/10/0012 │
│ ID Pegawai  : EMP-0012             Tim      : Engineering     │
│ Jabatan     : Backend Engineer     Status PTKP : K/1          │
│ NPWP        : xx.xxx.xxx.x-xxx.xxx  Rekening : BCA ****4521   │
├───────────────────────────────┬──────────────────────────────┤
│ PENDAPATAN                    │ POTONGAN                      │
│ Gaji Pokok        10.000.000  │ BPJS Kesehatan (1%)  100.000 │
│ Tunj. Transport      500.000  │ BPJS JHT (2%)        200.000 │
│ Tunj. Makan          600.000  │ BPJS JP (1%)         100.000 │
│ Lembur (6 jam)       531.792  │ PPh 21 (TER)         ...     │
│ Reimburse            350.000  │ Cuti tanpa gaji          0   │
│ Bonus                      0  │ Potongan lain            0   │
│───────────────────────────────│──────────────────────────────│
│ Total Pendapatan  11.981.792  │ Total Potongan       ...     │
├───────────────────────────────┴──────────────────────────────┤
│                 TAKE HOME PAY :  Rp xx.xxx.xxx                 │
│                 Terbilang     :  (... rupiah)                  │
├──────────────────────────────────────────────────────────────┤
│ Rincian lembur: tabel tanggal | jam | pengali | nominal        │
├──────────────────────────────────────────────────────────────┤
│ Informasi (tidak memotong gaji):                               │
│ BPJS Kes. perusahaan 4% · JHT perusahaan 3,7% · JP 2% · JKK · JKM│
├──────────────────────────────────────────────────────────────┤
│ Disetujui oleh: [Nama Stakeholder], [tanggal approve]          │
│ Dokumen ini dibuat otomatis oleh sistem dan sah tanpa tanda    │
│ tangan basah.                                                  │
└──────────────────────────────────────────────────────────────┘
```

Aturan template:
- Logo, nama, dan alamat perusahaan diambil dari CMS (Pengaturan Perusahaan).
- Baris komponen bernilai 0 boleh disembunyikan, kecuali komponen wajib (gaji pokok, BPJS, PPh 21).
- Format angka Rupiah: titik sebagai pemisah ribuan, tanpa desimal.
- Ada "terbilang" dalam Bahasa Indonesia.
- Nomor slip: `SG/YYYY/MM/NNNN`.
- PDF opsional dilindungi password (contoh: tanggal lahir pegawai `DDMMYYYY`), diatur di CMS.

---

## 8. Sales Pipeline (Tim Sales)

### Company (klien/calon klien)
Nama, industri, alamat, website, kontak PIC (nama, jabatan, email, telepon; bisa lebih dari satu), catatan.

### Opportunity
| Field | Keterangan |
|---|---|
| Kode | Auto `OPYYXXXX` |
| Nama opportunity | |
| Company | relasi ke Company |
| PIC Sales (owner) | user tim Sales |
| Nilai estimasi (Rp) | |
| Tahap | lihat di bawah |
| Probabilitas (%) | otomatis dari tahap, bisa diubah |
| Perkiraan closing | tanggal |
| Catatan / aktivitas | log aktivitas: meeting, call, email, presentasi, dengan tanggal |

**Tahap pipeline** (urutan bisa diatur di CMS):
`Lead → Kualifikasi → Proposal → Negosiasi → Won` / `Lost` (alasan kalah wajib diisi)

Tampilan: **kanban per tahap** dan **tabel**. Filter per sales, company, periode.

### Opportunity → Project (manual)
- Ada halaman/list **"Siap Dijadikan Project"** berisi opportunity berstatus **Won** yang belum punya project.
- Stakeholder atau Sales memilih opportunity, klik **Buat Project**, lalu isi:
  - Nama project (default dari nama opportunity)
  - **Tim pelaksana** (Produk / Data / Engineering / lainnya; bisa lebih dari satu)
  - Project Lead
  - Anggota
  - Tanggal mulai & target selesai
- Project baru tersimpan dengan relasi ke opportunity asal, dan otomatis dapat kode `PRYYXXXX` yang langsung bisa dipakai di timesheet.

---

## 9. Project Board (Tim Delivery)

### Project
Kode, nama, opportunity asal (opsional; project internal boleh tanpa opportunity), tim, lead, anggota, tanggal mulai, target selesai, status:
`Belum Mulai → Ongoing → Review/UAT → Selesai` (+ `On Hold`, `Batal`)

Progress (%) dihitung otomatis dari task yang selesai.

### Kanban board per project
- Kolom default: `Backlog → To Do → In Progress → Review → Done` (bisa diatur per project)
- Task: judul, deskripsi (rich text), assignee, prioritas (Rendah/Sedang/Tinggi/Urgent), deadline, label, checklist subtask, komentar, lampiran.
- Drag & drop antar kolom.
- Tampilan tambahan: **List** (tabel task) dan **Task Saya** (lintas project).

### Akses
- Anggota project: edit board project tersebut.
- Pegawai non-anggota: tidak bisa lihat (kecuali HR/Stakeholder yang read-only).
- Stakeholder: lihat semua project.

---

## 10. Dashboard Stakeholder

Halaman utama untuk role Stakeholder, berupa satu layar ringkasan:

**Perlu Tindakan Saya** (paling atas)
- Jumlah cuti, lembur, reimburse, dan payroll yang menunggu keputusan, masing-masing bisa diklik langsung ke antriannya.

**Project & Sales**
- Project **ongoing**: jumlah + daftar (nama, tim, progress, target selesai)
- Project **mau selesai**: target selesai ≤ 14 hari lagi, atau progress ≥ 80%
- Project **terlambat**: lewat target selesai tapi belum selesai
- **Opportunity**: total nilai pipeline per tahap, opportunity yang perkiraan closing-nya bulan ini, win rate
- **Siap dijadikan project**: opportunity Won yang belum punya project

**SDM**
- Jumlah pegawai aktif per tim
- Siapa yang cuti hari ini / minggu ini
- Rekap cuti: sudah ambil vs belum ambil sama sekali, sisa saldo
- Total jam lembur bulan ini (per tim)
- Pegawai yang timesheet-nya belum lengkap

**Keuangan**
- Total reimburse bulan ini (per kategori, per project)
- Total payroll bulan ini vs bulan lalu

HR dan Finance punya dashboard versi masing-masing (fokus ke antrian review mereka).

---

## 11. Notifikasi

Setiap perubahan status pengajuan mengirim:
- Notifikasi **in-app** (ikon lonceng + daftar notifikasi), dan
- **Email** (best effort; kalau email gagal, alur tetap jalan)

Penerima per tahap:
| Kejadian | Penerima |
|---|---|
| Pegawai ajukan cuti/lembur | HR |
| HR teruskan | Stakeholder + pegawai (status update) |
| HR tolak | Pegawai |
| Stakeholder putuskan | Pegawai + HR |
| Pegawai ajukan reimburse | Finance |
| Finance teruskan | Stakeholder + pegawai |
| Finance tolak / minta revisi | Pegawai |
| Stakeholder putuskan reimburse | Pegawai + Finance |
| Payroll diajukan | Stakeholder |
| Payroll disetujui | Finance + semua pegawai (slip tersedia) |
| Ditambahkan ke project / di-assign task | Pegawai terkait |

Setiap notifikasi berisi link langsung ke halaman yang relevan.

---

## 12. Keputusan yang Masih Terbuka

Tanyakan ke owner sebelum mengimplementasikan bagian terkait:

1. Kalau **Stakeholder sendiri** yang mengajukan cuti/lembur/reimburse, siapa yang memutuskan? (Usulan: Stakeholder lain; kalau cuma satu, cukup sampai HR/Finance.)
2. Jam kerja normal per hari: **8 jam** (default) atau 7 jam?
3. Mode lembur default: **Depnaker** atau **Flat**?
4. Periode payroll: **bulan kalender** atau **cutoff tanggal 26–25**?
5. Reimburse dibayar **terpisah** atau **lewat payroll**?
6. Apakah ada kebutuhan **atasan per tim** (Head of Sales, Head of Engineering) ikut approve sebelum HR? (Saat ini: tidak.)
7. ~~Login pakai **email + password** saja, atau juga **Google Workspace** kantor?~~ **Diputuskan (05 Okt 2026):** login pakai akun **Microsoft kantor (Outlook / Microsoft Entra ID)**. Email + password hanya untuk fase awal/demo.

---

## 13. Arsitektur & Stack yang Direkomendasikan

| Bagian | Pilihan |
|---|---|
| Backend + CMS + Auth + File | **Directus** (self-hosted, Docker) di atas **PostgreSQL** |
| Logic bisnis | **Directus Extensions** (TypeScript): hooks & custom endpoints untuk hitung lembur, saldo cuti, payroll, alur approval |
| Frontend | **Next.js** (App Router, TypeScript) + Tailwind + shadcn/ui, memakai **Directus SDK** |
| PDF slip gaji | Generate di server (extension Directus atau route Next.js), contoh @react-pdf/renderer atau HTML→PDF |
| Email | SMTP / Resend |
| Deploy | 1 VPS (Ubuntu, RAM ≥ 4GB) + Docker Compose (atau Coolify) + domain + HTTPS |
| Penyimpanan file | Disk VPS (volume Docker) untuk awal; bisa pindah ke S3/Cloudflare R2 |

### Pembagian peran
- **Halaman Pengaturan di Next.js app** dipakai HR/Finance/Stakeholder untuk mengatur master data dan tarif tanpa ubah kode: jam kerja, mode & pengali lembur, periode payroll, tarif BPJS, tabel TER, jenis cuti, kalender libur, activity code, kategori reimburse, tim, dan pengaturan perusahaan. *(Keputusan owner 05 Okt 2026: semua dinamis dari tampilan HR/Finance, bukan hanya dari Directus Admin.)* Data tetap disimpan di koleksi Directus.
- **Directus Admin (CMS)** tetap tersedia sebagai cadangan untuk admin teknis.
- **Next.js app** dipakai semua user untuk pekerjaan harian: timesheet, pengajuan, antrian approval, dashboard, sales pipeline, project board, dan slip gaji.

### Prinsip teknis
- Semua aturan bisnis (validasi overlap, hitung lembur, potong saldo, transisi status approval) dijalankan **di server** (Directus extension), bukan hanya di frontend.
- Transisi status hanya boleh lewat endpoint khusus (contoh `POST /approvals/leave/:id/forward`), bukan update field status langsung. Permission Directus untuk field `status` di-set read-only bagi semua role.
- Setiap transisi approval dicatat di tabel log (siapa, kapan, dari status apa ke apa, catatan).
- Skema database disimpan di repo lewat `directus schema snapshot` (file YAML) supaya bisa di-review dan di-deploy ulang.
- Uang disimpan sebagai **integer Rupiah** (tanpa desimal/float).
- Zona waktu: **Asia/Jakarta**.

### Gambaran koleksi data (awal, boleh disempurnakan)
`users` (bawaan Directus, + field tim, jabatan, tanggal masuk, status aktif) · `teams` · `company_settings` · `holidays` · `activity_codes` · `timesheet_entries` · `overtime_requests` · `leave_types` · `leave_balances` · `leave_requests` · `reimbursement_categories` · `reimbursements` · `reimbursement_files` · `salary_profiles` · `salary_allowances` · `payroll_settings` (BPJS, mode lembur, periode) · `pph21_ter_rates` · `payroll_runs` · `payslips` · `payslip_lines` · `approval_logs` · `notifications` · `companies` · `company_contacts` · `opportunities` · `opportunity_activities` · `projects` · `project_members` · `board_columns` · `tasks` · `task_comments`

---

## 14. Urutan Pengerjaan (Fase)

**Fase 0: Fondasi**
Setup Docker Compose (Directus + Postgres), repo, Next.js, login, 4 role + permission, master data dasar (tim, libur, activity code, pengaturan perusahaan), seed data dummy.

**Fase 1: Timesheet & Cuti**
Timesheet (mingguan + harian), validasi, rekap HR. Cuti + saldo + alur approval HR → Stakeholder + notifikasi.

**Fase 2: Lembur & Reimburse**
Deteksi lembur, alur pengajuan lembur. Reimburse + upload foto + alur Finance → Stakeholder → dibayar.

**Fase 3: Sales & Project**
Company, opportunity, pipeline kanban, konversi Won → Project, project board kanban, task.

**Fase 4: Payroll & Slip Gaji**
Profil gaji, generate payroll, approval, slip PDF, ekspor Excel.

**Fase 5: Dashboard**
Dashboard Stakeholder, HR, dan Finance.

Setiap fase selesai dengan: bisa dijalankan lokal, ada data dummy, ada pengujian untuk logic bisnis (hitung lembur, saldo cuti, payroll), lalu demo ke owner.

---

## 15. Di Luar Scope (jangan dikerjakan)

Absensi check-in/out, GPS, fingerprint/NFC · aplikasi mobile native (cukup web yang responsif) · accounting/jurnal · POS · chat · rekrutmen · LMS · multi-perusahaan (multi-tenant).
