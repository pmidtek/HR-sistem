/** Klien REST Directus kecil untuk script setup (memakai ADMIN_TOKEN dari .env di root repo). */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);

export const BASE_URL = process.env.DIRECTUS_URL ?? `http://localhost:${process.env.DIRECTUS_PORT ?? "8055"}`;
const TOKEN = process.env.ADMIN_TOKEN ?? "";

export class ApiError extends Error {
  constructor(public status: number, public path: string, public body: string) {
    super(`${status} ${path}: ${body.slice(0, 500)}`);
  }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new ApiError(res.status, `${method} ${path}`, text);
  if (!text) return undefined as T;
  const json = JSON.parse(text) as { data?: T };
  return json.data as T;
}

/** Tunggu Directus siap (container baru jalan butuh beberapa detik). */
export async function waitForDirectus(timeoutMs = 120_000): Promise<void> {
  if (!TOKEN) throw new Error("ADMIN_TOKEN belum diisi di .env");
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(`${BASE_URL}/server/ping`);
      if (res.ok) break;
    } catch {
      // belum siap
    }
    if (Date.now() - start > timeoutMs) throw new Error(`Directus tidak bisa dihubungi di ${BASE_URL}. Sudah jalankan "docker compose up -d"?`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  // Pastikan token admin valid.
  await api("GET", "/users/me");
}

export const log = (msg: string) => console.log(msg);

/** true jika file ini dijalankan langsung (bukan di-import). Aman untuk path yang mengandung spasi. */
export function isMain(metaUrl: string): boolean {
  return !!process.argv[1] && fileURLToPath(metaUrl) === process.argv[1];
}
