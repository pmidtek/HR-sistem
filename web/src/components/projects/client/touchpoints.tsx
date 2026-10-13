"use client";

import { Mail, MapPin, Pencil, Phone, Plus, Presentation, Trash2, Users, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import type { Company } from "@/lib/types";
import type { TouchpointType } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { deleteTouchpoint, saveTouchpoint, type TouchpointInput } from "@/store/actions-client";
import { stamp } from "@/store/project-core";
import { useLookups } from "../../hooks";
import { Button, IconButton } from "../../ui/button";
import { Card, EmptyState } from "../../ui/display";
import { Dialog } from "../../ui/dialog";
import { Field, Input, Select, Textarea } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { MultiSelect } from "../../ui/multi-select";
import { Stagger, StaggerItem } from "../../ui/motion";
import { AvatarStack } from "../task-bits";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

const typeMeta: Record<TouchpointType, [string, LucideIcon]> = {
  meeting: ["Meeting", Users], call: ["Telepon", Phone], email: ["Email", Mail], visit: ["Kunjungan", MapPin], presentation: ["Presentasi", Presentation],
};

const pickBtn = "flex min-h-10 w-full items-center gap-2 rounded-xxs bg-sunken px-3 text-left text-sm shadow-[inset_0_0_0_1px_var(--border-default)]";

/** Timeline interaksi dengan klien. */
export function Touchpoints({ company, data }: { company: Company; data: ProjectData }) {
  const { state, actor, today, run } = useAuthed();
  const { project, canEdit } = useProject();
  const { userName } = useLookups();
  const [form, setForm] = useState<TouchpointInput | null>(null);
  const list = state.touchpoints.filter((t) => t.projectId === project.id).sort((a, b) => b.date.localeCompare(a.date));
  const contactName = (id: string) => company.contacts.find((c) => c.id === id)?.name ?? id;
  const contactOptions = company.contacts.map((c) => ({ value: c.id, label: c.name, hint: c.title }));
  const save = () => form && run((s) => saveTouchpoint(s, project.id, form, actor, stamp(today)), "Interaksi tersimpan.") && setForm(null);

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <Button size="small" className="self-end" iconLeft={<Icon icon={Plus} size={14} />}
          onClick={() => setForm({ date: today, type: "meeting", summary: "", outcome: "", participantIds: [actor.id], contactIds: [] })}>Catat interaksi</Button>
      )}
      {list.length === 0 ? <EmptyState title="Belum ada interaksi" /> : (
        <Stagger as="ul" className="relative flex flex-col gap-3 pl-9 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-px before:bg-line-strong">
          {list.map((t, i) => {
            const [label, icon] = typeMeta[t.type];
            return (
              <StaggerItem as="li" key={t.id} index={i} className="relative">
                <span className="absolute top-4 -left-9 flex size-8 items-center justify-center rounded-full bg-overlay text-fg-muted shadow-[inset_0_0_0_1px_var(--border-strong)]"><Icon icon={icon} size={14} /></span>
                <Card padding="sm" className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-fg-subtle">{formatDate(t.date)} · {label}</span>
                    <span className="ml-auto flex">
                      {canEdit && <IconButton label="Edit" size="small" onClick={() => setForm({ ...t })}><Icon icon={Pencil} size={14} /></IconButton>}
                      {canEdit && <IconButton label="Hapus" size="small" onClick={() => run((s) => deleteTouchpoint(s, t.id, actor, stamp(today)), "Interaksi dihapus.")}><Icon icon={Trash2} size={14} /></IconButton>}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-fg">{t.summary}</p>
                  {t.outcome && <p className="text-sm text-fg-muted"><span className="text-fg-subtle">Hasil: </span>{t.outcome}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
                    <AvatarStack names={t.participantIds.map((id) => userName(id))} />
                    {t.contactIds.length > 0 && <span>Klien: {t.contactIds.map(contactName).join(", ")}</span>}
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
      {form && (
        <Dialog open onOpenChange={(o) => !o && setForm(null)} title={form.id ? "Edit interaksi" : "Interaksi baru"}
          footer={<><Button variant="secondary" tone="neutral" onClick={() => setForm(null)}>Batal</Button><Button disabled={!form.summary.trim()} onClick={save}>Simpan</Button></>}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Tanggal" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <Select label="Tipe" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TouchpointType })} options={Object.entries(typeMeta).map(([value, [label]]) => ({ value, label }))} />
            </div>
            <Input label="Ringkasan" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <Textarea label="Hasil" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
            <Field label="Peserta internal" id="tp-int">
              <MultiSelect options={data.memberOptions} value={form.participantIds} onChange={(v) => setForm({ ...form, participantIds: v })}>
                <button id="tp-int" type="button" className={pickBtn}>{form.participantIds.length ? form.participantIds.map((id) => userName(id)).join(", ") : <span className="text-fg-subtle">Pilih</span>}</button>
              </MultiSelect>
            </Field>
            <Field label="Kontak klien" id="tp-ext">
              <MultiSelect options={contactOptions} value={form.contactIds} onChange={(v) => setForm({ ...form, contactIds: v })}>
                <button id="tp-ext" type="button" className={pickBtn}>{form.contactIds.length ? form.contactIds.map(contactName).join(", ") : <span className="text-fg-subtle">Pilih</span>}</button>
              </MultiSelect>
            </Field>
          </div>
        </Dialog>
      )}
    </div>
  );
}
