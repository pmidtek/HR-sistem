/**
 * Tambah / ubah pegawai & external dari halaman Employees (HR, Finance).
 *   POST  /sidesah/users        { name, email, role, teamId, position, joinDate, active, external?: { company, sponsorId, accessUntil }, password? }
 *   PATCH /sidesah/users/:id    (body sama; password diisi hanya untuk reset)
 *
 * Aturan: role hanya role SIDESAH (bukan Administrator); tidak boleh mengubah role sendiri;
 * hanya Stakeholder yang boleh memberi / mencabut role Stakeholder; external wajib PIC & batas akses.
 * Pegawai internal login dengan Microsoft bila SSO aktif; external selalu email + password.
 */
import type { Router } from "express";
import { appRoleOf, ROLE, type AppRole } from "../../../access/roles";
import { bad, forbidden, inTx, notFound, route, str, today, type Actor, type Ctx } from "./lib/context";

type Body = Record<string, unknown>;
type Existing = { id: string; role: string | null; employee_code: string | null };

const ssoOn = (ctx: Ctx) => String((ctx.env as Record<string, unknown>).AUTH_PROVIDERS ?? "").split(",").map((s) => s.trim()).includes("microsoft");

function parse(body: Body) {
  const name = str(body.name, "Full name", { max: 200 }).trim();
  const email = str(body.email, "Email", { max: 200 }).trim().toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad("Name and a valid email are required.");
  const role = body.role as AppRole;
  if (!(role in ROLE)) throw bad("Unknown role.");
  const ext = (body.external ?? null) as Body | null;
  const external = role === "external" && ext ? {
    company: str(ext.company, "Company", { optional: true, max: 200 }).trim(),
    sponsorId: str(ext.sponsorId, "PIC", { optional: true }),
    accessUntil: str(ext.accessUntil, "Access until", { optional: true, max: 10 }),
  } : null;
  if (role === "external") {
    if (!external?.sponsorId) throw bad("Externals need an internal PIC.");
    if (!external.accessUntil) throw bad("Set when the external's access ends.");
  }
  const password = str(body.password, "Password", { optional: true, max: 200 });
  if (password && password.length < 8) throw bad("Password must be at least 8 characters.");
  const [first, ...rest] = name.split(/\s+/);
  return {
    role, external, password, email,
    row: {
      first_name: first, last_name: rest.join(" ") || null, email, role: ROLE[role],
      team: str(body.teamId, "Team", { optional: true }) || null,
      position: str(body.position, "Position", { optional: true, max: 200 }) || null,
      join_date: str(body.joinDate, "Join date", { optional: true, max: 10 }) || null,
      status: body.active === false ? "suspended" : "active",
      external_company: external?.company || null, sponsor: external?.sponsorId || null, access_until: external?.accessUntil || null,
    },
  };
}

function checkRoleChange(actor: Actor, targetId: string | null, from: AppRole | null, to: AppRole) {
  if (targetId === actor.id && from !== to) throw forbidden("You can't change your own role.");
  if ((to === "stakeholder" || from === "stakeholder") && from !== to && actor.role !== "stakeholder") throw forbidden("Only a Stakeholder can grant or remove the Stakeholder role.");
}

export function userRoutes(router: Router, ctx: Ctx) {
  const db = ctx.database;
  const canManage = (a: Actor) => a.role === "hr" || a.role === "finance" || a.role === "stakeholder";

  async function emailTaken(email: string, exceptId: string | null) {
    const q = db("directus_users").whereRaw("lower(email) = ?", [email]);
    if (exceptId) q.whereNot({ id: exceptId });
    return !!(await q.first("id"));
  }

  async function nextCode(prefix: "EMP-" | "EXT-") {
    const rows = await db<{ employee_code: string }>("directus_users").where("employee_code", "like", `${prefix}%`).select("employee_code");
    const max = rows.reduce((m, r) => Math.max(m, Number(r.employee_code.slice(4)) || 0), 0);
    return `${prefix}${String(max + 1).padStart(4, "0")}`;
  }

  async function checkSponsor(sponsorId: string | null, selfId: string | null) {
    if (!sponsorId) return;
    if (sponsorId === selfId) throw bad("An external can't be their own PIC.");
    const s = await db<Existing & { status: string }>("directus_users").where({ id: sponsorId }).first("id", "role", "status");
    const role = appRoleOf(s?.role);
    if (!s || !role || role === "external" || s.status !== "active") throw bad("The PIC must be an active internal employee.");
  }

  router.post("/users", route(ctx, async (req, actor) => {
    if (!canManage(actor)) throw forbidden();
    const p = parse(req.body ?? {});
    checkRoleChange(actor, null, null, p.role);
    if (await emailTaken(p.email, null)) throw bad("This email is already used by another account.");
    await checkSponsor(p.row.sponsor, null);
    const useSso = p.role !== "external" && ssoOn(ctx);
    if (!useSso && !p.password) throw bad("Set an initial password (at least 8 characters). Share it with the person privately.");
    if (p.role === "external" && p.row.access_until && p.row.access_until < today()) throw bad("Access end date is already in the past.");
    return inTx(ctx, async (tx) => {
      const id = (await new ctx.services.UsersService({ knex: tx.trx, schema: tx.schema }).createOne({
        ...p.row, employee_code: await nextCode(p.role === "external" ? "EXT-" : "EMP-"),
        ...(useSso ? { provider: "microsoft", external_identifier: p.email } : { provider: "default" }),
        ...(p.password ? { password: p.password } : {}),
      })) as string;
      return { id, sso: useSso };
    });
  }));

  router.patch("/users/:id", route(ctx, async (req, actor) => {
    if (!canManage(actor)) throw forbidden();
    const prev = await db<Existing>("directus_users").where({ id: req.params.id }).first("id", "role", "employee_code");
    if (!prev) throw notFound("Employee not found.");
    const from = appRoleOf(prev.role);
    if (!from) throw forbidden("This account is managed by the technical admin.");
    const p = parse(req.body ?? {});
    checkRoleChange(actor, prev.id, from, p.role);
    if (await emailTaken(p.email, prev.id)) throw bad("This email is already used by another account.");
    await checkSponsor(p.row.sponsor, prev.id);
    if (prev.id === actor.id && p.row.status !== "active") throw forbidden("You can't deactivate your own account.");
    return inTx(ctx, async (tx) => {
      const sso = p.role !== "external" && ssoOn(ctx);
      await new ctx.services.UsersService({ knex: tx.trx, schema: tx.schema }).updateOne(prev.id, {
        ...p.row,
        ...(sso ? { provider: "microsoft", external_identifier: p.email } : { provider: "default", external_identifier: null }),
        ...(p.password ? { password: p.password } : {}),
      });
      return { id: prev.id };
    });
  }));
}
