# HRIS Internal — Frontend

Next.js (App Router) + Tailwind + Cartogram Design System. Saat ini memakai **data dummy** di memori browser (refresh halaman = data kembali ke awal).

```bash
pnpm install
pnpm dev          # http://localhost:3000 → pilih akun demo di halaman login
pnpm test         # unit test logic (lembur, cuti, timesheet, approval, payroll)
pnpm typecheck
pnpm lint
```

## Struktur

| Folder | Isi |
|---|---|
| `src/styles/tokens.css` | Token Cartogram (warna, tipografi, radius, motion), tema gelap & terang |
| `src/components/ui/` | Komponen dasar: Button, Input, Select, Combobox (searchable), Dialog, Tabs, Table, Badge, Card |
| `src/components/` | Komponen per fitur (timesheet, approvals, payroll, sales, projects, settings, dashboard) |
| `src/app/(app)/` | Halaman setelah login |
| `src/lib/calc/` | Logic murni + unit test. Akan dipakai ulang di Directus Extensions |
| `src/lib/mock/` | Data dummy |
| `src/store/` | State sementara + `actions*.ts` (simulasi endpoint server) |
