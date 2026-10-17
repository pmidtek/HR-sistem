/**
 * Sumber data frontend.
 * - "directus" (default): data asli dari backend lewat /panel (proxy Next.js → Directus).
 * - "mock": data dummy di memori browser (untuk demo tanpa backend). Set NEXT_PUBLIC_DATA_SOURCE=mock.
 */
export const BACKEND = process.env.NEXT_PUBLIC_DATA_SOURCE !== "mock";

/** Semua panggilan API lewat jalur yang sama dengan panel admin (satu domain → cookie sesi otomatis ikut). */
export const API_BASE = "/panel";

/** Tampilkan tab "Demo accounts" (login cepat akun demo, password demo12345). Hanya untuk lokal/staging. */
export const DEMO_LOGIN = process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";
export const DEMO_PASSWORD = "demo12345";
