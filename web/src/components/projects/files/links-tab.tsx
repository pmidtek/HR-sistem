"use client";

import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ProjectLink } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deleteLink, saveLink, type LinkInput } from "@/store/actions-files";
import { stamp } from "@/store/project-core";
import { useLookups } from "../../hooks";
import { Button, IconButton } from "../../ui/button";
import { Card, EmptyState } from "../../ui/display";
import { Dialog } from "../../ui/dialog";
import { Input, Select } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { useProject } from "../workspace/context";

export const LINK_CATEGORIES = ["Dokumen", "Desain", "Repo", "Lingkungan", "Lainnya"];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Tautan project dikelompokkan per kategori. Ikon domain = huruf awal host (tanpa memuat favicon eksternal). */
export function LinksTab() {
  const { state, actor, today, run } = useAuthed();
  const { project, canEdit } = useProject();
  const { userName } = useLookups();
  const [form, setForm] = useState<LinkInput | null>(null);
  const links = state.projectLinks.filter((l) => l.projectId === project.id);
  const cats = [...LINK_CATEGORIES, ...new Set(links.map((l) => l.category).filter((c) => !LINK_CATEGORIES.includes(c)))].filter((c) => links.some((l) => l.category === c));
  const save = () => form && run((s) => saveLink(s, project.id, form, actor, stamp(today)), "Tautan tersimpan.") && setForm(null);
  const edit = (l: ProjectLink) => setForm({ id: l.id, label: l.label, url: l.url, category: l.category });

  return (
    <div className="flex flex-col gap-4">
      {canEdit && <Button size="small" className="self-end" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setForm({ label: "", url: "https://", category: "Dokumen" })}>Tambah tautan</Button>}
      {links.length === 0 && <EmptyState title="Belum ada tautan" description="Simpan link repo, desain, dokumen, dan lingkungan di sini." />}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
        {cats.map((c) => (
          <Card key={c} className="flex flex-col gap-2">
            <h3 className="font-mono text-[11px] tracking-[0.08em] text-fg-subtle uppercase">{c}</h3>
            {links.filter((l) => l.category === c).map((l) => (
              <div key={l.id} className="group flex items-center gap-3 rounded-xs px-2 py-2 hover:bg-hover">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xs bg-sunken font-mono text-xs text-fg-muted uppercase shadow-[inset_0_0_0_1px_var(--border-default)]">{hostOf(l.url).slice(0, 2)}</span>
                <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm text-fg hover:text-fg-brand">{l.label} <Icon icon={ExternalLink} size={12} /></span>
                  <span className="block truncate text-xs text-fg-subtle">{hostOf(l.url)} · {userName(l.addedBy)}</span>
                </a>
                {canEdit && (
                  <span className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <IconButton label="Edit tautan" size="small" onClick={() => edit(l)}><Icon icon={Pencil} size={14} /></IconButton>
                    <IconButton label="Hapus tautan" size="small" onClick={() => run((s) => deleteLink(s, l.id, actor, stamp(today)), "Tautan dihapus.")}><Icon icon={Trash2} size={14} /></IconButton>
                  </span>
                )}
              </div>
            ))}
          </Card>
        ))}
      </div>
      {form && (
        <Dialog open onOpenChange={(o) => !o && setForm(null)} title={form.id ? "Edit tautan" : "Tautan baru"}
          footer={<><Button variant="secondary" tone="neutral" onClick={() => setForm(null)}>Batal</Button><Button disabled={!form.label.trim()} onClick={save}>Simpan</Button></>}>
          <div className="flex flex-col gap-4">
            <Input label="Label" value={form.label} autoFocus onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <Input label="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Select label="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={LINK_CATEGORIES} />
          </div>
        </Dialog>
      )}
    </div>
  );
}
