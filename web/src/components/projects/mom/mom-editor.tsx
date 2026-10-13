"use client";

import { Paperclip } from "lucide-react";
import type { Mom } from "@/lib/project-types";
import type { MomPatch } from "@/store/actions-mom";
import { Field, Input } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { Markdown } from "../../ui/markdown";
import { MultiSelect } from "../../ui/multi-select";
import { AvatarStack } from "../task-bits";
import { useLookups } from "../../hooks";
import type { ProjectData } from "../use-project-data";
import { MomActionItems } from "./mom-action-items";

export type MomDraft = Required<MomPatch>;

type Props = {
  mom: Mom;
  draft: MomDraft;
  data: ProjectData;
  onChange: (d: MomDraft) => void;
  onToTask: (itemId: string, boardId: string) => void;
  onAttach: (f: { name: string; size: number }) => void;
};

/** Form editor MOM: info rapat, isi markdown (tulis | pratinjau berdampingan), action item, lampiran. */
export function MomEditor({ mom, draft, data, onChange, onToTask, onAttach }: Props) {
  const { userName } = useLookups();
  const set = <K extends keyof MomDraft>(k: K, v: MomDraft[K]) => onChange({ ...draft, [k]: v });
  const savedIds = new Set(mom.actionItems.map((a) => a.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
        <Input label="Judul rapat" value={draft.title} onChange={(e) => set("title", e.target.value)} />
        <Input label="Tanggal rapat" type="date" value={draft.meetingDate} onChange={(e) => set("meetingDate", e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Peserta internal" id="mom-attendees">
          <MultiSelect options={data.memberOptions} value={draft.attendeeIds} onChange={(v) => set("attendeeIds", v)} searchPlaceholder="Cari anggota…">
            <button id="mom-attendees" type="button" className="flex min-h-10 w-full items-center gap-2 rounded-xxs bg-sunken px-3 text-left text-sm shadow-[inset_0_0_0_1px_var(--border-default)]">
              {draft.attendeeIds.length ? <><AvatarStack names={draft.attendeeIds.map((id) => userName(id))} max={5} /><span className="text-xs text-fg-muted">{draft.attendeeIds.length} orang</span></> : <span className="text-fg-subtle">Pilih peserta</span>}
            </button>
          </MultiSelect>
        </Field>
        <Input label="Peserta eksternal" helperText="Pisahkan dengan koma, mis. Wulan Sari (COO), Citra (IT)"
          value={draft.externalAttendees.join(", ")}
          onChange={(e) => set("externalAttendees", e.target.value.split(",").map((x) => x.trimStart()).filter((x, i, arr) => x !== "" || i === arr.length - 1))} />
      </div>
      <Field label="Isi (markdown)" id="mom-body">
        <div className="grid gap-3 lg:grid-cols-2">
          <textarea id="mom-body" value={draft.body} rows={16} onChange={(e) => set("body", e.target.value)}
            className="w-full resize-y rounded-xxs bg-sunken p-3 font-mono text-[13px] text-fg shadow-[inset_0_0_0_1px_var(--border-default)] focus:shadow-[inset_0_0_0_1px_var(--brand)] focus:outline-none" />
          <div className="rounded-xxs p-3 shadow-[inset_0_0_0_1px_var(--border-default)]">
            <p className="mb-2 font-mono text-[10px] tracking-[0.08em] text-fg-subtle uppercase">Pratinjau</p>
            <Markdown>{draft.body}</Markdown>
          </div>
        </div>
      </Field>
      <section className="flex flex-col gap-2">
        <h3 className="font-display text-sm font-medium">Action item</h3>
        <MomActionItems items={draft.actionItems} data={data} editable onChange={(v) => set("actionItems", v)} onToTask={onToTask} savedIds={savedIds} />
      </section>
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-medium">Lampiran</h3>
          <label className="cursor-pointer text-xs text-fg-brand hover:underline">
            Unggah
            <input type="file" multiple className="sr-only" onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => onAttach({ name: f.name, size: f.size })); e.target.value = ""; }} />
          </label>
        </div>
        {mom.attachments.length === 0 && <p className="text-xs text-fg-subtle">Belum ada lampiran (unggah masih simulasi).</p>}
        {mom.attachments.map((f) => <p key={f.id} className="flex items-center gap-2 text-sm text-fg-muted"><Icon icon={Paperclip} size={14} />{f.name}</p>)}
      </section>
    </div>
  );
}
