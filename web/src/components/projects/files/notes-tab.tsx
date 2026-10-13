"use client";

import { Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import type { Note } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deleteNote, saveNote, type NoteInput } from "@/store/actions-files";
import { stamp } from "@/store/project-core";
import { newId } from "@/store/state";
import { useLookups } from "../../hooks";
import { Button, IconButton } from "../../ui/button";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { Card, EmptyState } from "../../ui/display";
import { Icon } from "../../ui/icon";
import { Markdown } from "../../ui/markdown";
import { Tabs } from "../../ui/tabs";
import { useProject } from "../workspace/context";

const input = "w-full rounded-xxs bg-sunken px-3 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border-default)] focus:shadow-[inset_0_0_0_1px_var(--brand)] focus:outline-none";

/** Catatan: daftar (cari, filter tag, pin di atas) | editor markdown. */
export function NotesTab({ startNew }: { startNew: boolean }) {
  const { state, actor, today, run } = useAuthed();
  const { project, canEdit } = useProject();
  const { userName } = useLookups();
  const notes = state.notes.filter((n) => n.projectId === project.id).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [selected, setSelected] = useState<string | null>(startNew ? "new" : (notes[0]?.id ?? null));
  const [draft, setDraft] = useState<NoteInput | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("preview");
  const [confirm, setConfirm] = useState(false);
  const tags = [...new Set(notes.flatMap((n) => n.tags))].sort();
  const list = notes.filter((n) => (!tag || n.tags.includes(tag)) && (!q || `${n.title} ${n.body}`.toLowerCase().includes(q.toLowerCase())));
  const note = notes.find((n) => n.id === selected);
  const current: NoteInput = draft ?? (note ? { id: note.id, title: note.title, body: note.body, tags: note.tags, pinned: note.pinned } : { title: "", body: "", tags: [], pinned: false });
  const editing = canEdit && (selected === "new" || draft !== null || mode === "write");
  const at = () => stamp(today);

  function open(n: Note | null) {
    setSelected(n?.id ?? "new");
    setDraft(n ? null : { title: "", body: "", tags: [], pinned: false });
    setMode(n ? "preview" : "write");
  }

  function save() {
    const id = current.id ?? newId("note");
    if (run((s) => saveNote(s, project.id, current, actor, at(), id), "Catatan tersimpan.")) {
      setSelected(id);
      setDraft(null);
      setMode("preview");
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <Icon icon={Search} size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-subtle" />
            <input className={`${input} h-9 pl-8`} placeholder="Cari catatan" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {canEdit && <IconButton label="Catatan baru" variant="secondary" onClick={() => open(null)}><Icon icon={Plus} size={16} /></IconButton>}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button key={t} type="button" onClick={() => setTag(tag === t ? "" : t)} className={cn("rounded-pill px-2.5 py-0.5 text-xs", tag === t ? "bg-brand-subtle text-fg-brand" : "bg-hover text-fg-muted hover:text-fg")}>#{t}</button>
            ))}
          </div>
        )}
        <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
          {list.length === 0 && <li className="py-6 text-center text-xs text-fg-muted">Tidak ada catatan.</li>}
          {list.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)} className={cn("flex w-full flex-col gap-0.5 rounded-xs px-3 py-2.5 text-left", n.id === selected ? "bg-brand-subtle" : "hover:bg-hover")}>
                <span className="flex items-center gap-1.5 text-sm text-fg">{n.pinned && <Icon icon={Pin} size={12} className="text-fg-brand" />}<span className="truncate">{n.title}</span></span>
                <span className="truncate text-xs text-fg-subtle">{userName(n.authorId)} · {formatRelative(n.updatedAt, at())}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {!note && selected !== "new" ? <EmptyState title="Pilih atau buat catatan" /> : (
        <Card className="flex min-h-[420px] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <input className={`${input} h-10 flex-1 font-display text-lg`} placeholder="Judul catatan" value={current.title} onChange={(e) => setDraft({ ...current, title: e.target.value })} />
            ) : <h3 className="flex-1 font-display text-lg font-medium">{current.title}</h3>}
            {canEdit && (
              <>
                <Tabs variant="pill" value={editing ? "write" : "preview"} onChange={(m) => { setMode(m); if (m === "write" && !draft) setDraft(current); }} tabs={[{ value: "write", label: "Tulis" }, { value: "preview", label: "Pratinjau" }]} />
                <IconButton label={current.pinned ? "Lepas pin" : "Pin"} onClick={() => setDraft({ ...current, pinned: !current.pinned })}><Icon icon={current.pinned ? PinOff : Pin} size={16} /></IconButton>
                {note && <IconButton label="Hapus catatan" onClick={() => setConfirm(true)}><Icon icon={Trash2} size={16} /></IconButton>}
              </>
            )}
          </div>
          {editing ? (
            <>
              <input className={`${input} h-9`} placeholder="Tag, pisahkan dengan koma" value={current.tags.join(", ")} onChange={(e) => setDraft({ ...current, tags: e.target.value.split(",") })} />
              <textarea className={`${input} flex-1 resize-y py-3 font-mono text-[13px]`} rows={14} value={current.body} onChange={(e) => setDraft({ ...current, body: e.target.value })} placeholder="Tulis dalam markdown…" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" tone="neutral" size="small" onClick={() => { setDraft(null); setMode("preview"); if (selected === "new") setSelected(notes[0]?.id ?? null); }}>Batal</Button>
                <Button size="small" onClick={save}>Simpan</Button>
              </div>
            </>
          ) : (
            <>
              {current.tags.length > 0 && <p className="flex flex-wrap gap-1.5">{current.tags.map((t) => <span key={t} className="rounded-pill bg-hover px-2 py-0.5 text-xs text-fg-muted">#{t}</span>)}</p>}
              <Markdown className="text-[15px]">{current.body}</Markdown>
              {draft && <div className="flex justify-end"><Button size="small" onClick={save}>Simpan perubahan</Button></div>}
            </>
          )}
        </Card>
      )}
      {note && (
        <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Hapus "${note.title}"?`}
          onConfirm={() => { if (run((s) => deleteNote(s, note.id, actor, at()), "Catatan dihapus.")) { setConfirm(false); setSelected(null); setDraft(null); } }} />
      )}
    </div>
  );
}
