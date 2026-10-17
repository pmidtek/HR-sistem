/**
 * Terapkan role, policy, dan permission SIDESAH. Aman diulang:
 * role & policy dibuat/diperbarui berdasarkan ID tetap; permission milik policy SIDESAH ditulis ulang
 * dari access/permissions.ts (permission adalah konfigurasi, bukan data pegawai).
 */
import { folders } from "../access/folders";
import { allPermissions } from "../access/permissions";
import { policies, roles } from "../access/roles";
import { api, ApiError, isMain, log, waitForDirectus } from "./client";

type Row = { id: string };

async function exists(path: string): Promise<boolean> {
  try {
    await api("GET", path);
    return true;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 403 || e.status === 404)) return false;
    throw e;
  }
}

export async function applyAccess(): Promise<void> {
  for (const pol of policies) {
    const body = { name: pol.name, icon: pol.icon, description: pol.description, admin_access: false, app_access: false, enforce_tfa: false };
    if (await exists(`/policies/${pol.id}`)) await api("PATCH", `/policies/${pol.id}`, body);
    else {
      await api("POST", "/policies", { id: pol.id, ...body });
      log(`+ policy ${pol.name}`);
    }
  }

  for (const role of roles) {
    const body = { name: role.name, icon: role.icon, description: role.description };
    if (await exists(`/roles/${role.id}`)) await api("PATCH", `/roles/${role.id}`, body);
    else {
      await api("POST", "/roles", { id: role.id, ...body });
      log(`+ role ${role.name}`);
    }
    // Sambungkan policy ke role (tabel directus_access).
    const linked = await api<{ policy: string }[]>("GET", `/access?filter[role][_eq]=${role.id}&fields=policy&limit=-1`);
    for (const pid of role.policies) {
      if (!linked.some((l) => l.policy === pid)) await api("POST", "/access", { role: role.id, policy: pid });
    }
  }

  // Folder penyimpanan file (struk, bukti bayar, aset perusahaan).
  for (const f of folders) {
    if (await exists(`/folders/${f.id}`)) await api("PATCH", `/folders/${f.id}`, { name: f.name });
    else {
      await api("POST", "/folders", f);
      log(`+ folder file ${f.name}`);
    }
  }

  // Tulis ulang permission milik policy SIDESAH.
  const ids = policies.map((x) => x.id).join(",");
  const old = await api<Row[]>("GET", `/permissions?filter[policy][_in]=${ids}&fields=id&limit=-1`);
  if (old.length > 0) await api("DELETE", "/permissions", old.map((r) => r.id));
  const perms = allPermissions();
  for (let i = 0; i < perms.length; i += 100) await api("POST", "/permissions", perms.slice(i, i + 100));
  log(`Akses selesai: ${roles.length} role, ${policies.length} policy, ${perms.length} permission.`);
}

if (isMain(import.meta.url)) {
  await waitForDirectus();
  await applyAccess();
}
