/**
 * Hook otomatis SIDESAH:
 * - sidik jari SHA-256 setiap file upload (deteksi struk yang sama dipakai dua kali)
 * - External yang masa aksesnya habis tidak bisa login, dan dinonaktifkan tiap malam
 * - kunci unik saldo cuti (pegawai + jenis + tahun)
 * - anggota project saja yang boleh menambah isi project
 * - sinkron akun Microsoft terjadwal
 */
import { createHash } from "node:crypto";
import { defineHook } from "@directus/extensions-sdk";
import { ROLE } from "../../../access/roles";
import { PROJECT_CHILDREN } from "../../../access/permissions";
import { today, ymd } from "./lib/context";
import { refreshUsdRate } from "./fx";
import { runMicrosoftSync, syncConfigured } from "./ms-sync";

type Payload = Record<string, unknown>;
type Meta = { key?: string; payload?: Payload };
type Acc = { user?: string | null; admin?: boolean } | null;

export default defineHook(({ filter, action, schedule, init }, ctx) => {
  const db = ctx.database;
  const env = ctx.env as Record<string, string | undefined>;

  action("files.upload", async (meta: Meta) => {
    const id = meta.key;
    if (!id) return;
    try {
      const svc = new ctx.services.AssetsService({ schema: await ctx.getSchema() });
      const { stream } = await svc.getAsset(id);
      const hash = createHash("sha256");
      for await (const chunk of stream) hash.update(chunk as Buffer);
      await db("directus_files").where({ id }).update({ sha256: hash.digest("hex") });
    } catch (e) {
      ctx.logger.warn(`sha256 gagal untuk file ${id}: ${String(e)}`);
    }
  });

  filter("auth.login", async (payload: Payload, meta: { payload?: { email?: string }; user?: string }) => {
    const email = meta.payload?.email;
    const where = meta.user ? { id: meta.user } : email ? { email } : null;
    if (!where) return payload;
    const u = await db("directus_users").where(where).first<{ role: string | null; access_until: string | Date | null } | undefined>();
    const until = u?.access_until ? ymd(u.access_until) : null;
    if (u?.role === ROLE.external && until && until < today()) throw new Error("Your access period has ended. Contact your PIC.");
    return payload;
  });

  // Tiap hari 00:05 WIB: nonaktifkan external yang masa aksesnya lewat (memutus sesi yang masih aktif).
  schedule("5 0 * * *", async () => {
    const n = await db("directus_users").where({ role: ROLE.external, status: "active" }).where("access_until", "<", today()).update({ status: "suspended" });
    if (n > 0) ctx.logger.info(`SIDESAH: ${n} external dinonaktifkan (akses habis).`);
  });

  filter("leave_balances.items.create", (payload: Payload) => ({ ...payload, unique_key: `${payload.employee}:${payload.leave_type}:${payload.year}` }));

  // Hanya lead/member project yang boleh menambah isi project (permission create tidak bisa memfilter relasi).
  for (const collection of PROJECT_CHILDREN) {
    filter(`${collection}.items.create`, async (payload: Payload, _meta: unknown, context: { accountability?: Acc }) => {
      const acc = context.accountability;
      if (!acc?.user || acc.admin) return payload;
      const member = await db("project_members").where({ project: payload.project, user: acc.user }).whereIn("role", ["lead", "member"]).first();
      if (!member) throw new Error("Only project members can add items to this project.");
      return payload;
    });
  }

  // Kurs USD → IDR: tiap 6 jam (ECB terbit sekali per hari kerja; dicek berkala supaya cepat ikut).
  const fx = async () => {
    try {
      const r = await refreshUsdRate(ctx);
      if (r) ctx.logger.info(`SIDESAH kurs USD: Rp${r.rate} (${r.source} ${r.date})`);
    } catch (e) {
      ctx.logger.warn(`SIDESAH kurs USD gagal diperbarui: ${String(e)}`);
    }
  };
  schedule("15 */6 * * *", fx);
  init("app.after", () => void fx());

  if (syncConfigured(env)) {
    schedule(env.MS_SYNC_CRON || "0 6 * * *", async () => {
      try {
        const r = await runMicrosoftSync(ctx);
        ctx.logger.info(`SIDESAH sinkron Microsoft: ${JSON.stringify(r)}`);
      } catch (e) {
        ctx.logger.error(`SIDESAH sinkron Microsoft gagal: ${String(e)}`);
      }
    });
  }
});
