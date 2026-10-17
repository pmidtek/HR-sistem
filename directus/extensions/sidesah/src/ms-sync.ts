/**
 * Sinkron akun & role dari Microsoft Entra ID (Outlook kantor) lewat Microsoft Graph.
 * - Pegawai baru di Microsoft → dibuat di SIDESAH (provider "microsoft", login via SSO).
 * - Nama & jabatan disegarkan dari Microsoft.
 * - Role diambil dari keanggotaan grup (MS_GROUP_STAKEHOLDER / HR / FINANCE); sisanya Employee.
 *   Kalau tidak ada grup role yang diisi, role TIDAK disentuh (diatur HR manual).
 * - Akun yang dinonaktifkan / keluar dari grup staf di Microsoft → status "suspended" (tidak bisa login).
 * Akun External dan Administrator tidak pernah disentuh.
 *
 * Izin Graph (Application, perlu admin consent): User.Read.All, GroupMember.Read.All.
 */
import type { Knex } from "knex";
import { ROLE } from "../../../access/roles";
import type { Ctx } from "./lib/context";

type GraphUser = { id: string; givenName: string | null; surname: string | null; displayName: string | null; mail: string | null; userPrincipalName: string; jobTitle: string | null; accountEnabled: boolean };
type Env = Record<string, string | undefined>;

export type SyncResult = { created: number; updated: number; suspended: number; skipped: number };

const SELECT = "id,givenName,surname,displayName,mail,userPrincipalName,jobTitle,accountEnabled";

export function syncConfigured(env: Env): boolean {
  return env.MS_SYNC_ENABLED === "true" && !!env.MS_TENANT_ID && !!env.MS_CLIENT_ID && !!env.MS_CLIENT_SECRET;
}

async function token(env: Env): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.MS_CLIENT_ID ?? "", client_secret: env.MS_CLIENT_SECRET ?? "", scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Microsoft token gagal: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Ambil semua halaman hasil Graph (@odata.nextLink). */
async function all<T>(tok: string, url: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url;
  while (next) {
    const res: Response = await fetch(next, { headers: { Authorization: `Bearer ${tok}`, ConsistencyLevel: "eventual" } });
    if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
    const page = (await res.json()) as { value: T[]; "@odata.nextLink"?: string };
    out.push(...page.value);
    next = page["@odata.nextLink"];
  }
  return out;
}

const G = "https://graph.microsoft.com/v1.0";

async function memberIds(tok: string, groupId: string | undefined): Promise<Set<string>> {
  if (!groupId) return new Set();
  const rows = await all<{ id: string }>(tok, `${G}/groups/${groupId}/transitiveMembers/microsoft.graph.user?$select=id&$top=999`);
  return new Set(rows.map((r) => r.id));
}

/** Role dari grup, prioritas: Stakeholder > Finance > HR > Employee. null = jangan ubah role. */
export function roleFromGroups(id: string, groups: { stakeholder: Set<string>; finance: Set<string>; hr: Set<string> }, mappingOn: boolean): string | null {
  if (!mappingOn) return null;
  if (groups.stakeholder.has(id)) return ROLE.stakeholder;
  if (groups.finance.has(id)) return ROLE.finance;
  if (groups.hr.has(id)) return ROLE.hr;
  return ROLE.employee;
}

type Row = { id: string; email: string | null; role: string | null; status: string; ms_object_id: string | null; provider: string };
const INTERNAL = new Set<string>([ROLE.stakeholder, ROLE.hr, ROLE.finance, ROLE.employee]);

export async function runMicrosoftSync(ctx: Ctx): Promise<SyncResult> {
  const env = ctx.env as Env;
  if (!syncConfigured(env)) throw new Error("Sinkron Microsoft belum diatur (MS_SYNC_ENABLED, MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET).");
  const tok = await token(env);
  const staff = env.MS_GROUP_ALL_STAFF
    ? await all<GraphUser>(tok, `${G}/groups/${env.MS_GROUP_ALL_STAFF}/transitiveMembers/microsoft.graph.user?$select=${SELECT}&$top=999`)
    : await all<GraphUser>(tok, `${G}/users?$select=${SELECT}&$top=999&$filter=accountEnabled eq true and userType eq 'Member'&$count=true`);
  const groups = {
    stakeholder: await memberIds(tok, env.MS_GROUP_STAKEHOLDER),
    finance: await memberIds(tok, env.MS_GROUP_FINANCE),
    hr: await memberIds(tok, env.MS_GROUP_HR),
  };
  const mappingOn = !!(env.MS_GROUP_STAKEHOLDER || env.MS_GROUP_FINANCE || env.MS_GROUP_HR);
  return applySync(ctx.database, staff, groups, mappingOn);
}

/** Bagian yang menulis ke database (dipisah supaya mudah dites tanpa Graph). */
export async function applySync(db: Knex, staff: GraphUser[], groups: { stakeholder: Set<string>; finance: Set<string>; hr: Set<string> }, mappingOn: boolean): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, suspended: 0, skipped: 0 };
  const now = new Date().toISOString();
  const seen = new Set<string>();
  await db.transaction(async (trx) => {
    for (const g of staff) {
      const email = (g.mail ?? g.userPrincipalName ?? "").trim().toLowerCase();
      if (!email || !email.includes("@") || email.includes("#ext#")) {
        result.skipped++;
        continue;
      }
      seen.add(g.id);
      const existing = await trx<Row>("directus_users").where({ ms_object_id: g.id }).orWhereRaw("lower(email) = ?", [email]).first();
      const names = { first_name: g.givenName ?? g.displayName ?? email, last_name: g.surname ?? null };
      const mapped = roleFromGroups(g.id, groups, mappingOn);
      const status = g.accountEnabled ? "active" : "suspended";
      if (!existing) {
        await trx("directus_users").insert({
          id: crypto.randomUUID(), email, ...names, position: g.jobTitle, role: mapped ?? ROLE.employee, status,
          provider: "microsoft", external_identifier: email, ms_object_id: g.id, ms_synced_at: now,
        });
        result.created++;
        continue;
      }
      // External & Administrator tidak disentuh.
      if (existing.role && !INTERNAL.has(existing.role)) {
        result.skipped++;
        continue;
      }
      await trx("directus_users").where({ id: existing.id }).update({
        ...names, position: g.jobTitle ?? undefined, email, ms_object_id: g.id, ms_synced_at: now,
        provider: "microsoft", external_identifier: email,
        ...(mapped ? { role: mapped } : {}),
        ...(existing.status === "active" || existing.status === "suspended" ? { status } : {}),
      });
      result.updated++;
    }
    // Pegawai yang sudah tidak ada di Microsoft (atau keluar dari grup staf) → nonaktif.
    const gone = await trx<Row>("directus_users").whereNotNull("ms_object_id").where({ status: "active" }).whereIn("role", [...INTERNAL]).select("id", "ms_object_id");
    const ids = gone.filter((u) => u.ms_object_id && !seen.has(u.ms_object_id)).map((u) => u.id);
    if (ids.length > 0 && staff.length > 0) {
      await trx("directus_users").whereIn("id", ids).update({ status: "suspended", ms_synced_at: now });
      result.suspended = ids.length;
    }
  });
  return result;
}
