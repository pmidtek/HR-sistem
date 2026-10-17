/**
 * Terapkan skema di folder schema/ ke Directus. Aman dijalankan berulang kali ("migrasi maju"):
 * - koleksi / field / relasi yang belum ada → dibuat
 * - yang sudah ada → metadata tampilan (catatan, pilihan dropdown, dsb.) disegarkan; TIPE KOLOM TIDAK DIUBAH
 * - yang ada di database tapi tidak ada di schema/ → hanya dilaporkan, TIDAK dihapus
 */
import { registry, type CollectionDef, type FieldDef, type RelationDef } from "../schema/index";
import { api, isMain, log, waitForDirectus } from "./client";

type Existing = { collection: string; schema: unknown };
type ExistingField = { collection: string; field: string; type: string };
type ExistingRelation = { collection: string; field: string };

const key = (c: string, f: string) => `${c}.${f}`;
const isOwn = (c: string) => !c.startsWith("directus_");

export async function applySchema(): Promise<void> {
  const collections = await api<Existing[]>("GET", "/collections");
  const have = new Set(collections.map((c) => c.collection));
  const fields = await api<ExistingField[]>("GET", "/fields");
  const haveField = new Map(fields.map((f) => [key(f.collection, f.field), f]));
  const relations = await api<ExistingRelation[]>("GET", "/relations");
  const haveRel = new Set(relations.map((r) => key(r.collection, r.field)));

  let created = 0;
  let updated = 0;
  // Field yang baru dibuat di run ini tidak perlu disegarkan lagi.
  const fresh = new Set<string>();

  // 1. Folder dulu (koleksi lain bisa masuk ke folder).
  for (const c of registry.collections.filter((x) => x.isFolder)) {
    if (have.has(c.collection)) {
      await api("PATCH", `/collections/${c.collection}`, { meta: c.meta });
      continue;
    }
    await api("POST", "/collections", { collection: c.collection, meta: c.meta, schema: null });
    have.add(c.collection);
    created++;
    log(`+ folder ${c.collection}`);
  }

  // 2. Koleksi baru beserta kolom non-alias (kolom FK ikut dibuat, relasinya menyusul).
  for (const c of dedupe(registry.collections.filter((x) => !x.isFolder))) {
    if (have.has(c.collection)) continue;
    const own = registry.fields.filter((f) => f.collection === c.collection && f.type !== "alias");
    await api("POST", "/collections", { collection: c.collection, meta: c.meta, schema: {}, fields: own.map(payload) });
    have.add(c.collection);
    for (const f of own) {
      haveField.set(key(f.collection, f.field), { collection: f.collection, field: f.field, type: f.type });
      fresh.add(key(f.collection, f.field));
    }
    created++;
    log(`+ collection ${c.collection} (${own.length} fields)`);
  }

  // 3. Field yang belum ada (termasuk tambahan ke directus_users/directus_files dan field alias o2m/m2m).
  const ordered = [...registry.fields.filter((f) => f.type !== "alias"), ...registry.fields.filter((f) => f.type === "alias")];
  for (const f of ordered) {
    const prev = haveField.get(key(f.collection, f.field));
    if (!prev) {
      await api("POST", `/fields/${f.collection}`, payload(f));
      haveField.set(key(f.collection, f.field), { collection: f.collection, field: f.field, type: f.type });
      created++;
      log(`+ field ${f.collection}.${f.field}`);
      continue;
    }
    if (prev.type !== f.type) {
      log(`! ${f.collection}.${f.field}: tipe di database "${prev.type}" ≠ schema "${f.type}". Tidak diubah otomatis; buat migrasi manual.`);
      continue;
    }
    if (f.field === "id" || fresh.has(key(f.collection, f.field))) continue;
    await api("PATCH", `/fields/${f.collection}/${f.field}`, { meta: f.meta });
    updated++;
  }

  // 4. Relasi.
  for (const r of registry.relations) {
    if (haveRel.has(key(r.collection, r.field))) {
      await api("PATCH", `/relations/${r.collection}/${r.field}`, { meta: r.meta });
      continue;
    }
    await api("POST", "/relations", relationPayload(r));
    haveRel.add(key(r.collection, r.field));
    created++;
    log(`+ relation ${r.collection}.${r.field} → ${r.related_collection}`);
  }

  // 5. Laporan: yang ada di database tapi tidak didefinisikan.
  const defined = new Set(registry.fields.map((f) => key(f.collection, f.field)));
  const definedCols = new Set(registry.collections.map((c) => c.collection));
  for (const c of collections) if (isOwn(c.collection) && !definedCols.has(c.collection)) log(`? koleksi "${c.collection}" ada di database tapi tidak di schema/`);
  for (const f of fields) {
    if (isOwn(f.collection) && definedCols.has(f.collection) && !defined.has(key(f.collection, f.field))) log(`? field "${f.collection}.${f.field}" ada di database tapi tidak di schema/`);
  }

  log(`Skema selesai: ${created} dibuat, ${updated} metadata disegarkan.`);
}

function dedupe(list: CollectionDef[]): CollectionDef[] {
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.collection) ? false : (seen.add(c.collection), true)));
}

function payload(f: FieldDef) {
  return { field: f.field, type: f.type, meta: f.meta, schema: f.schema };
}

function relationPayload(r: RelationDef) {
  return { collection: r.collection, field: r.field, related_collection: r.related_collection, meta: r.meta, schema: r.schema };
}

if (isMain(import.meta.url)) {
  await waitForDirectus();
  await applySchema();
}
