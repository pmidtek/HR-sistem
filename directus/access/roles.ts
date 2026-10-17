/**
 * Role & policy SIDESAH dengan ID tetap (supaya bisa dirujuk dari .env, mis. AUTH_MICROSOFT_DEFAULT_ROLE_ID,
 * dan dari extension). Role aplikasi = role Directus.
 *
 * Semua policy app_access = false: pegawai memakai aplikasi SIDESAH (Next.js), bukan panel Directus.
 * Panel Directus (/panel) hanya untuk admin teknis.
 */

export const ROLE = {
  stakeholder: "5e5a0000-0000-4000-8000-000000000001",
  hr: "5e5a0000-0000-4000-8000-000000000002",
  finance: "5e5a0000-0000-4000-8000-000000000003",
  employee: "5e5a0000-0000-4000-8000-000000000004",
  external: "5e5a0000-0000-4000-8000-000000000005",
} as const;

export type AppRole = keyof typeof ROLE;

export const POLICY = {
  staffBase: "5e5a0001-0000-4000-8000-000000000010",
  externalBase: "5e5a0001-0000-4000-8000-000000000011",
  stakeholder: "5e5a0001-0000-4000-8000-000000000001",
  hr: "5e5a0001-0000-4000-8000-000000000002",
  finance: "5e5a0001-0000-4000-8000-000000000003",
} as const;

export const roles: { id: string; name: string; icon: string; description: string; policies: string[] }[] = [
  { id: ROLE.stakeholder, name: "Stakeholder", icon: "workspace_premium", description: "Keputusan akhir cuti, lembur, reimburse, payroll", policies: [POLICY.staffBase, POLICY.stakeholder] },
  { id: ROLE.hr, name: "HR", icon: "diversity_3", description: "Data pegawai, cuti, libur, activity code", policies: [POLICY.staffBase, POLICY.hr] },
  { id: ROLE.finance, name: "Finance", icon: "account_balance", description: "Review reimburse, payroll, verifikasi rekening", policies: [POLICY.staffBase, POLICY.finance] },
  { id: ROLE.employee, name: "Employee", icon: "person", description: "Pegawai", policies: [POLICY.staffBase] },
  { id: ROLE.external, name: "External", icon: "badge", description: "Freelance/vendor: hanya reimburse, wajib PIC", policies: [POLICY.externalBase] },
];

export const policies: { id: string; name: string; icon: string; description: string }[] = [
  { id: POLICY.staffBase, name: "SIDESAH · Staff base", icon: "person", description: "Akses dasar semua pegawai internal (data sendiri)" },
  { id: POLICY.externalBase, name: "SIDESAH · External base", icon: "badge", description: "Akses external: reimburse milik sendiri" },
  { id: POLICY.stakeholder, name: "SIDESAH · Stakeholder", icon: "workspace_premium", description: "Lihat semua data, ubah semua pengaturan" },
  { id: POLICY.hr, name: "SIDESAH · HR", icon: "diversity_3", description: "Kelola pegawai & pengaturan HR" },
  { id: POLICY.finance, name: "SIDESAH · Finance", icon: "account_balance", description: "Reimburse, payroll, rekening, tarif" },
];

/** Role Directus → role aplikasi (dipakai extension & frontend). */
export function appRoleOf(roleId: string | null | undefined): AppRole | null {
  const hit = (Object.keys(ROLE) as AppRole[]).find((k) => ROLE[k] === roleId);
  return hit ?? null;
}
