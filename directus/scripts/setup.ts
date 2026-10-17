/**
 * Satu perintah untuk menyiapkan / memperbarui backend:  pnpm --dir directus bootstrap   (tambah --demo untuk akun demo)
 * Urutan: tunggu Directus → skema (migrasi maju) → role & permission → master data.
 * Aman dijalankan berulang kali, termasuk di server produksi (tanpa --demo).
 */
import { applyAccess } from "./apply-access";
import { applySchema } from "./apply-schema";
import { log, waitForDirectus } from "./client";
import { seedDemo, seedMaster } from "./seed";

await waitForDirectus();
log("1/3 Skema…");
await applySchema();
log("2/3 Role & permission…");
await applyAccess();
log("3/3 Master data…");
await seedMaster();
if (process.argv.includes("--demo")) await seedDemo();
log("✅ Backend siap. Panel admin: /panel (lewat frontend) atau http://localhost:8055/admin");
