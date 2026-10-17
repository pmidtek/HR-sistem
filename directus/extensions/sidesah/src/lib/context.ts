/** Utilitas bersama endpoint: siapa yang memanggil, error HTTP, transaksi, notifikasi. */
import type { Accountability, ApiExtensionContext, SchemaOverview } from "@directus/types";
import type { Knex } from "knex";
import type { NextFunction, Request, Response } from "express";
import { appRoleOf, ROLE, type AppRole } from "../../../../access/roles";

export type Ctx = ApiExtensionContext;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const bad = (msg: string) => new HttpError(400, msg);
export const forbidden = (msg = "You are not allowed to do this.") => new HttpError(403, msg);
export const notFound = (msg = "Not found.") => new HttpError(404, msg);

export type Actor = { id: string; role: AppRole; name: string; email: string };

type Req = Request & { accountability?: Accountability };

/** Bungkus handler async: error → JSON format Directus `{ errors: [{ message }] }`. */
export function route(ctx: Ctx, fn: (req: Req, actor: Actor) => Promise<unknown>) {
  return async (req: Req, res: Response, next: NextFunction) => {
    try {
      const actor = await actorOf(ctx.database, req.accountability);
      const data = await fn(req, actor);
      res.json({ data: data ?? null });
    } catch (e) {
      if (e instanceof HttpError) {
        res.status(e.status).json({ errors: [{ message: e.message, extensions: { code: e.status === 403 ? "FORBIDDEN" : "INVALID_PAYLOAD" } }] });
        return;
      }
      ctx.logger.error(e);
      next(e);
    }
  };
}

type UserRow = { id: string; role: string | null; first_name: string | null; last_name: string | null; email: string | null; status: string };

export async function actorOf(db: Knex, acc: Accountability | undefined): Promise<Actor> {
  if (!acc?.user) throw new HttpError(401, "Please sign in.");
  const u = await db<UserRow>("directus_users").where({ id: acc.user }).first("id", "role", "first_name", "last_name", "email", "status");
  if (!u || u.status !== "active") throw new HttpError(401, "Your account is not active.");
  const role = appRoleOf(u.role);
  if (!role) throw forbidden("Your account has no SIDESAH role yet. Ask HR.");
  return { id: u.id, role, name: fullName(u), email: u.email ?? "" };
}

export const fullName = (u: { first_name: string | null; last_name: string | null }) => [u.first_name, u.last_name].filter(Boolean).join(" ") || "Someone";

export async function nameOf(db: Knex, userId: string): Promise<string> {
  const u = await db<UserRow>("directus_users").where({ id: userId }).first("first_name", "last_name");
  return u ? fullName(u) : "Someone";
}

/** Id pengguna aktif dengan role tertentu (penerima notifikasi). */
export async function idsByRole(db: Knex, role: AppRole): Promise<string[]> {
  const rows = await db<UserRow>("directus_users").where({ role: ROLE[role], status: "active" }).select("id");
  return rows.map((r) => r.id);
}

/**
 * Kolom `date` dari Postgres datang sebagai objek Date jam 00:00 waktu server (Asia/Jakarta).
 * JANGAN pakai toISOString() (UTC → mundur 1 hari); ambil komponen tanggal lokalnya.
 */
export function ymd(v: string | Date | null | undefined): string {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
}

/** Tanggal hari ini di Asia/Jakarta (YYYY-MM-DD). */
export function today(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

export type Tx = { trx: Knex.Transaction; schema: SchemaOverview };

/** Jalankan dalam satu transaksi database; semua tulis memakai ItemsService tanpa accountability (sudah dicek di endpoint). */
export async function inTx<T>(ctx: Ctx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const schema = await ctx.getSchema();
  return ctx.database.transaction((trx) => fn({ trx, schema }));
}

export function items(ctx: Ctx, tx: Tx, collection: string) {
  return new ctx.services.ItemsService(collection, { knex: tx.trx, schema: tx.schema });
}

/** Catat transisi status ke approval_logs. */
export async function logTransition(ctx: Ctx, tx: Tx, e: { collection: string; id: string; owner: string; sponsor: string | null; from: string | null; to: string; actor: string; note?: string | null }) {
  await items(ctx, tx, "approval_logs").createOne({
    subject_collection: e.collection, subject_id: e.id, subject_user: e.owner, subject_sponsor: e.sponsor,
    from_status: e.from, to_status: e.to, note: e.note ?? null, actor: e.actor,
  });
}

/** Notifikasi in-app ke beberapa penerima (duplikat & kosong diabaikan). */
export async function notify(ctx: Ctx, tx: Tx, recipients: string[], title: string, body: string, href: string) {
  const ids = [...new Set(recipients.filter(Boolean))];
  if (ids.length === 0) return;
  await items(ctx, tx, "notifications").createMany(ids.map((recipient) => ({ recipient, title, body, href, read: false })));
}

/** Validasi ringan payload JSON. */
export function str(v: unknown, field: string, opts: { optional?: boolean; max?: number } = {}): string {
  if (v === undefined || v === null || v === "") {
    if (opts.optional) return "";
    throw bad(`${field} is required.`);
  }
  if (typeof v !== "string") throw bad(`${field} must be text.`);
  if (opts.max && v.length > opts.max) throw bad(`${field} is too long.`);
  return v;
}

export function int(v: unknown, field: string, opts: { nullable?: boolean } = {}): number | null {
  if (v === null || v === undefined) {
    if (opts.nullable) return null;
    throw bad(`${field} is required.`);
  }
  if (typeof v !== "number" || !Number.isInteger(v)) throw bad(`${field} must be a whole number.`);
  return v;
}

export function strArray(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw bad(`${field} must be a list.`);
  return v as string[];
}
