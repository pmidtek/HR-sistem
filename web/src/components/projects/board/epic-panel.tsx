"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { progressOf } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import type { Epic } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deleteEpic, deleteStory, saveEpic, saveStory } from "@/store/actions-epics";
import { stamp } from "@/store/project-core";
import { Button, IconButton } from "../../ui/button";
import { Dialog } from "../../ui/dialog";
import { EmptyState } from "../../ui/display";
import { Input } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { GrowBar } from "../../ui/motion";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";
import { COLUMN_COLORS } from "./column-dialog";

type EpicDraft = Pick<Epic, "title" | "description" | "color"> & { id?: string };

/** Panel epic → story beserta progress; kelola epic/story (lead & stakeholder). */
export function EpicPanel({ data, onClose }: { data: ProjectData; onClose: () => void }) {
  const { actor, today, run } = useAuthed();
  const { project, canManage } = useProject();
  const [draft, setDraft] = useState<EpicDraft | null>(null);
  const [storyText, setStoryText] = useState<Record<string, string>>({});
  const at = () => stamp(today);

  const tasksOfStory = (storyId: string) => data.tasks.filter((t) => t.storyId === storyId);
  const tasksOfEpic = (epicId: string) => data.stories.filter((s) => s.epicId === epicId).flatMap((s) => tasksOfStory(s.id));

  function submitEpic() {
    if (draft && run((s) => saveEpic(s, project.id, draft, actor, at()), draft.id ? "Epic diperbarui." : "Epic dibuat.")) setDraft(null);
  }
  function addStory(epicId: string) {
    const title = storyText[epicId] ?? "";
    if (title.trim() && run((s) => saveStory(s, { epicId, title }, actor, at()), "Story ditambahkan.")) setStoryText((x) => ({ ...x, [epicId]: "" }));
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Epic & story" description="Kelompokkan task besar (epic) menjadi story." width="lg">
      <div className="flex flex-col gap-4">
        {canManage && !draft && (
          <Button size="small" variant="secondary" tone="neutral" className="self-start" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setDraft({ title: "", description: "", color: COLUMN_COLORS[2] })}>Epic baru</Button>
        )}
        {draft && (
          <div className="flex flex-col gap-3 rounded-s bg-sunken p-4">
            <Input label="Judul epic" value={draft.title} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Input label="Deskripsi" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              {COLUMN_COLORS.map((c) => (
                <button key={c} type="button" aria-label="Warna epic" onClick={() => setDraft({ ...draft, color: c })} className={cn("size-7 rounded-full", draft.color === c && "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface-overlay)]")} style={{ background: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="small" disabled={!draft.title.trim()} onClick={submitEpic}>Simpan</Button>
              <Button size="small" variant="ghost" tone="neutral" onClick={() => setDraft(null)}>Batal</Button>
            </div>
          </div>
        )}
        {data.epics.length === 0 && !draft && <EmptyState title="Belum ada epic" />}
        {data.epics.map((epic) => {
          const prog = progressOf(tasksOfEpic(epic.id), data.doneCols);
          return (
            <div key={epic.id} className="flex flex-col gap-3 rounded-s p-4 shadow-[inset_0_0_0_1px_var(--border-default)]">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: epic.color }} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-medium">{epic.title}</p>
                  {epic.description && <p className="text-xs text-fg-muted">{epic.description}</p>}
                </div>
                <span className="font-mono text-xs text-fg-muted">{prog.done}/{prog.total} · {prog.percent}%</span>
                {canManage && (
                  <>
                    <IconButton label="Edit epic" size="small" onClick={() => setDraft({ id: epic.id, title: epic.title, description: epic.description, color: epic.color })}><Icon icon={Pencil} size={14} /></IconButton>
                    <IconButton label="Hapus epic" size="small" onClick={() => run((s) => deleteEpic(s, epic.id, actor, at()), "Epic dihapus.")}><Icon icon={Trash2} size={14} /></IconButton>
                  </>
                )}
              </div>
              <span className="h-1.5 overflow-hidden rounded-[4px] bg-hover"><GrowBar ratio={prog.percent / 100} className="h-full w-full rounded-[4px] bg-brand" /></span>
              <ul className="flex flex-col gap-1 pl-5">
                {data.stories.filter((s) => s.epicId === epic.id).map((story) => {
                  const sp = progressOf(tasksOfStory(story.id), data.doneCols);
                  return (
                    <li key={story.id} className="group flex items-center gap-2 text-sm">
                      <span className="flex-1 text-fg-muted">{story.title}</span>
                      <span className="font-mono text-[11px] text-fg-subtle">{sp.done}/{sp.total}</span>
                      {canManage && (
                        <IconButton label="Hapus story" size="small" className="opacity-0 group-hover:opacity-100" onClick={() => run((s) => deleteStory(s, story.id, actor, at()), "Story dihapus.")}>
                          <Icon icon={Trash2} size={12} />
                        </IconButton>
                      )}
                    </li>
                  );
                })}
                {canManage && (
                  <li className="flex gap-2 pt-1">
                    <input
                      value={storyText[epic.id] ?? ""} placeholder="Tambah story lalu Enter"
                      onChange={(e) => setStoryText((x) => ({ ...x, [epic.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addStory(epic.id)}
                      className="h-8 flex-1 rounded-xxs bg-sunken px-2 text-xs shadow-[inset_0_0_0_1px_var(--border-default)]"
                    />
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
