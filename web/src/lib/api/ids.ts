/**
 * ID tetap dari backend. HARUS sama dengan directus/access/roles.ts & directus/access/folders.ts
 * (dicek otomatis oleh ids.test.ts).
 */
import type { Role } from "../types";

export const ROLE_ID: Record<Role, string> = {
  stakeholder: "5e5a0000-0000-4000-8000-000000000001",
  hr: "5e5a0000-0000-4000-8000-000000000002",
  finance: "5e5a0000-0000-4000-8000-000000000003",
  employee: "5e5a0000-0000-4000-8000-000000000004",
  external: "5e5a0000-0000-4000-8000-000000000005",
};

export function roleFromId(id: string | null | undefined): Role | null {
  const hit = (Object.keys(ROLE_ID) as Role[]).find((r) => ROLE_ID[r] === id);
  return hit ?? null;
}

/** Folder penyimpanan file di Directus. */
export const FOLDER = {
  receipts: "5e5a0002-0000-4000-8000-000000000001",
  paymentProofs: "5e5a0002-0000-4000-8000-000000000002",
  companyAssets: "5e5a0002-0000-4000-8000-000000000003",
} as const;
