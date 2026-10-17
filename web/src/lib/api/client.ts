/**
 * Klien HTTP ke backend Directus lewat /panel. Login memakai cookie sesi (httpOnly) dari Directus,
 * jadi frontend tidak pernah menyimpan token sendiri.
 */
import { API_BASE } from "./config";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | object | undefined>;

/** Ubah query ke format Directus: objek (filter, deep) dikirim sebagai JSON. */
export function qs(query: Query = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    p.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: { data?: T; errors?: { message: string }[] } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // Bukan JSON = server backend tidak menjawab dengan benar (mati / restart / proxy gagal).
    throw new ApiError(res.status, res.status >= 500 ? "Can't reach the server right now. Please try again in a moment." : `Unexpected response from the server (${res.status}).`);
  }
  if (!res.ok) {
    const msg = json.errors?.[0]?.message ?? `Request failed (${res.status}).`;
    throw new ApiError(res.status, friendly(res.status, msg));
  }
  return json.data as T;
}

/** Pesan error Directus yang teknis diganti kalimat yang mudah dipahami. */
function friendly(status: number, msg: string): string {
  if (status === 401) return msg.includes("credentials") ? "Wrong email or password." : "Your session has ended. Please sign in again.";
  if (status === 403 && msg.startsWith("You don't have permission")) return "You are not allowed to do this.";
  if (msg.includes("has to be unique")) return "This value is already used.";
  if (msg.includes("foreign key") || msg.includes("violates")) return "This item is still used elsewhere, so it can't be removed.";
  return msg;
}

export async function apiGet<T>(path: string, query?: Query): Promise<T> {
  return parse<T>(await fetch(`${API_BASE}${path}${qs(query)}`, { credentials: "same-origin", cache: "no-store" }));
}

export async function apiSend<T>(method: "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parse<T>(res);
}

/** Upload satu file ke folder tertentu. Mengembalikan id file Directus. */
export async function uploadFile(file: File, folder: string): Promise<{ id: string; filename_download: string }> {
  const form = new FormData();
  form.append("folder", folder);
  form.append("title", file.name);
  form.append("file", file, file.name);
  const res = await fetch(`${API_BASE}/files`, { method: "POST", credentials: "same-origin", body: form });
  return parse<{ id: string; filename_download: string }>(res);
}

/** URL untuk membuka file (gambar/PDF) di aplikasi; cookie sesi ikut otomatis. */
export const assetUrl = (id: string) => `${API_BASE}/assets/${id}`;
