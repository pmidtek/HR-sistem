/**
 * DSL kecil untuk mendefinisikan koleksi Directus sebagai kode.
 * File di folder ini = sumber kebenaran skema. `pnpm schema:apply` menerapkannya ke Directus
 * (hanya MENAMBAH koleksi/field/relasi yang belum ada; tidak pernah menghapus atau mengubah tipe).
 *
 * Konvensi: uang = integer Rupiah, persen = basis poin (1% = 100), tanggal = "date", waktu kejadian = "timestamp".
 */

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Obj = Record<string, Json | undefined>;

export type FieldDef = { collection: string; field: string; type: string; meta: Obj; schema: Obj | null };
export type RelationDef = { collection: string; field: string; related_collection: string | null; meta: Obj; schema: Obj | null };
export type CollectionDef = { collection: string; meta: Obj; isFolder: boolean };

export const registry = { collections: [] as CollectionDef[], fields: [] as FieldDef[], relations: [] as RelationDef[] };

type Common = { required?: boolean; note?: string; hidden?: boolean; readonly?: boolean; width?: "half" | "full" };
type ColOpts = Common & { unique?: boolean; indexed?: boolean; nullable?: boolean; default?: Json; max?: number };

const meta = (o: Common, extra: Obj = {}): Obj => ({
  required: o.required ?? false,
  note: o.note ?? null,
  hidden: o.hidden ?? false,
  readonly: o.readonly ?? false,
  width: o.width ?? "full",
  ...extra,
});

const col = (o: ColOpts, extra: Obj = {}): Obj => ({
  is_nullable: o.nullable ?? !o.required,
  is_unique: o.unique ?? false,
  is_indexed: o.indexed ?? false,
  default_value: o.default ?? null,
  ...extra,
});

export type Choice = string | { value: string; text: string };

/** Builder satu koleksi. Semua method menambah field ke registry global. */
export class C {
  constructor(public readonly name: string) {}

  private push(field: string, type: string, m: Obj, s: Obj | null) {
    registry.fields.push({ collection: this.name, field, type, meta: m, schema: s });
    return this;
  }

  string(field: string, o: ColOpts = {}) {
    return this.push(field, "string", meta(o, { interface: "input" }), col(o, { max_length: o.max ?? 255 }));
  }
  text(field: string, o: ColOpts = {}) {
    return this.push(field, "text", meta(o, { interface: "input-multiline" }), col(o));
  }
  /** Integer 32-bit (maks ±2,1 miliar). Cukup untuk nominal per baris/slip. */
  integer(field: string, o: ColOpts = {}) {
    return this.push(field, "integer", meta(o, { interface: "input" }), col(o));
  }
  /** Integer 64-bit. Catatan: Directus mengembalikan bigInteger sebagai STRING di JSON. */
  bigInteger(field: string, o: ColOpts = {}) {
    return this.push(field, "bigInteger", meta(o, { interface: "input" }), col(o));
  }
  float(field: string, o: ColOpts = {}) {
    return this.push(field, "float", meta(o, { interface: "input" }), col(o));
  }
  boolean(field: string, o: ColOpts & { default: boolean }) {
    return this.push(field, "boolean", meta(o, { interface: "boolean", special: ["cast-boolean"] }), col({ ...o, nullable: false }));
  }
  date(field: string, o: ColOpts = {}) {
    return this.push(field, "date", meta(o, { interface: "datetime" }), col(o));
  }
  time(field: string, o: ColOpts = {}) {
    return this.push(field, "time", meta(o, { interface: "datetime" }), col(o));
  }
  timestamp(field: string, o: ColOpts = {}) {
    return this.push(field, "timestamp", meta(o, { interface: "datetime" }), col(o));
  }
  json(field: string, o: ColOpts = {}) {
    return this.push(field, "json", meta(o, { interface: "input-code", options: { language: "json" }, special: ["cast-json"] }), col(o));
  }
  /** String dengan pilihan tetap (dropdown). Validasi nilai dilakukan di endpoint. */
  choice(field: string, choices: Choice[], o: ColOpts = {}) {
    const list = choices.map((c) => (typeof c === "string" ? { value: c, text: c } : c));
    return this.push(field, "string", meta(o, { interface: "select-dropdown", display: "labels", options: { choices: list } }), col(o, { max_length: 40 }));
  }

  /** Many-to-one. `reverse` = nama field o2m (alias) yang dibuat di koleksi tujuan. */
  m2o(field: string, related: string, o: ColOpts & { onDelete?: "SET NULL" | "CASCADE" | "RESTRICT" | "NO ACTION"; reverse?: string; display?: string } = {}) {
    const isUser = related === "directus_users";
    const isFile = related === "directus_files";
    const iface = isUser ? "select-dropdown-m2o" : isFile ? "file" : "select-dropdown-m2o";
    const template = o.display ?? (isUser ? "{{first_name}} {{last_name}}" : undefined);
    this.push(field, "uuid", meta(o, { interface: iface, special: [isFile ? "file" : "m2o"], options: template ? { template } : null }), col(o));
    const onDelete = o.onDelete ?? (o.required ? "RESTRICT" : "SET NULL");
    registry.relations.push({
      collection: this.name,
      field,
      related_collection: related,
      meta: { one_field: o.reverse ?? null, one_deselect_action: onDelete === "CASCADE" ? "delete" : "nullify" },
      schema: { on_delete: onDelete },
    });
    if (o.reverse) {
      registry.fields.push({
        collection: related,
        field: o.reverse,
        type: "alias",
        meta: { interface: "list-o2m", special: ["o2m"], hidden: false, readonly: false, required: false, width: "full", note: null },
        schema: null,
      });
    }
    return this;
  }

  /**
   * Many-to-many lewat koleksi junction (dibuat otomatis, tersembunyi).
   * Untuk lampiran file pakai related = "directus_files".
   */
  m2m(field: string, related: string, junction: string, o: Common & { reverse?: string } = {}) {
    const isFile = related === "directus_files";
    const left = `${this.name}_id`;
    const right = related === this.name ? `related_${related}_id` : `${related}_id`;
    registry.collections.push({ collection: junction, meta: { hidden: true, icon: "import_export" }, isFolder: false });
    registry.fields.push(uuidPkField(junction));
    registry.fields.push({ collection: junction, field: left, type: "uuid", meta: { hidden: true }, schema: { is_nullable: true } });
    registry.fields.push({ collection: junction, field: right, type: "uuid", meta: { hidden: true }, schema: { is_nullable: true } });
    registry.fields.push({
      collection: this.name,
      field,
      type: "alias",
      meta: meta(o, { interface: isFile ? "files" : "list-m2m", special: [isFile ? "files" : "m2m"] }),
      schema: null,
    });
    registry.relations.push({
      collection: junction, field: left, related_collection: this.name,
      meta: { one_field: field, junction_field: right, one_deselect_action: "delete" }, schema: { on_delete: "CASCADE" },
    });
    registry.relations.push({
      collection: junction, field: right, related_collection: related,
      meta: { one_field: o.reverse ?? null, junction_field: left, one_deselect_action: "nullify" }, schema: { on_delete: "CASCADE" },
    });
    // Sisi balik (mis. directus_files → link ke struk) supaya permission bisa memfilter "file milik klaim saya".
    if (o.reverse) {
      registry.fields.push({
        collection: related, field: o.reverse, type: "alias",
        meta: { interface: "list-o2m", special: ["o2m"], hidden: true, readonly: true, required: false, width: "full", note: null },
        schema: null,
      });
    }
    return this;
  }

  sort() {
    return this.push("sort", "integer", { interface: "input", hidden: true }, { is_nullable: true });
  }
  /** date_created, date_updated, user_created, user_updated (diisi otomatis Directus). */
  stamps(which: ("created" | "updated" | "user_created" | "user_updated")[] = ["created", "updated"]) {
    const tpl = { template: "{{first_name}} {{last_name}}" };
    for (const w of which) {
      if (w === "created") this.push("date_created", "timestamp", { special: ["date-created"], interface: "datetime", readonly: true, hidden: true, width: "half" }, { is_nullable: true });
      if (w === "updated") this.push("date_updated", "timestamp", { special: ["date-updated"], interface: "datetime", readonly: true, hidden: true, width: "half" }, { is_nullable: true });
      if (w === "user_created" || w === "user_updated") {
        this.push(w, "uuid", { special: [w === "user_created" ? "user-created" : "user-updated"], interface: "select-dropdown-m2o", options: tpl, readonly: true, hidden: true, width: "half" }, { is_nullable: true });
        registry.relations.push({ collection: this.name, field: w, related_collection: "directus_users", meta: { one_field: null }, schema: { on_delete: "SET NULL" } });
      }
    }
    return this;
  }
}

function uuidPkField(collection: string): FieldDef {
  return {
    collection,
    field: "id",
    type: "uuid",
    meta: { hidden: true, readonly: true, interface: "input", special: ["uuid"] },
    schema: { is_primary_key: true, length: 36, has_auto_increment: false, is_nullable: false },
  };
}

type CollectionOpts = { icon?: string; note?: string; singleton?: boolean; hidden?: boolean; display?: string; group?: string; sort?: boolean };

/** Koleksi baru dengan primary key UUID. */
export function collection(name: string, o: CollectionOpts, build: (c: C) => void): void {
  registry.collections.push({
    collection: name,
    meta: {
      icon: o.icon ?? "box",
      note: o.note ?? null,
      singleton: o.singleton ?? false,
      hidden: o.hidden ?? false,
      display_template: o.display ?? null,
      group: o.group ?? null,
      sort_field: o.sort ? "sort" : null,
    },
    isFolder: false,
  });
  registry.fields.push(uuidPkField(name));
  const c = new C(name);
  if (o.sort) c.sort();
  build(c);
}

/** Tambah field ke koleksi bawaan Directus (directus_users, directus_files). */
export function extend(name: "directus_users" | "directus_files", build: (c: C) => void): void {
  build(new C(name));
}

/** Folder pengelompokan di sidebar Directus Admin (tanpa tabel). */
/** `label` = nama yang tampil di panel (nama teknis `grp_*` tidak ditampilkan). `sort` = urutan di menu. */
export function folder(name: string, icon: string, note: string, label: string, sort: number): void {
  const translations = ["en-US", "id-ID"].map((language) => ({ language, translation: label, singular: label, plural: label }));
  registry.collections.push({ collection: name, meta: { icon, note, collapse: "open", translations, sort }, isFolder: true });
}
