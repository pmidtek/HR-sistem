"use client";

import { ArrowLeft, Printer, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { canEditPublished } from "@/lib/projects";
import type { Mom } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { actionItemToTask, addMomAttachment, deleteMom, publishMom, saveMom } from "@/store/actions-mom";
import { stamp } from "@/store/project-core";
import { newId } from "@/store/state";
import { MomDocument } from "@/components/projects/mom/mom-document";
import { MomEditor, type MomDraft } from "@/components/projects/mom/mom-editor";
import { useProjectData } from "@/components/projects/use-project-data";
import { useProject } from "@/components/projects/workspace/context";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, EmptyState } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";

const toDraft = (m: Mom): MomDraft => ({ title: m.title, meetingDate: m.meetingDate, attendeeIds: m.attendeeIds, externalAttendees: m.externalAttendees, body: m.body, actionItems: m.actionItems });
const clean = (d: MomDraft): MomDraft => ({ ...d, externalAttendees: d.externalAttendees.map((x) => x.trim()).filter(Boolean) });

export default function MomEditorPage({ params }: PageProps<"/projects/[id]/mom/[momId]">) {
  const { momId } = use(params);
  const { state, user, actor, today, run } = useAuthed();
  const { project, base, canEdit } = useProject();
  const data = useProjectData();
  const router = useRouter();
  const mom = state.moms.find((m) => m.id === momId && m.projectId === project.id);
  const editable = Boolean(mom) && canEdit && (mom?.status === "draft" || (mom ? canEditPublished(user, project, mom.authorId) : false));
  const [mode, setMode] = useState<"edit" | "read">(editable && mom?.status === "draft" ? "edit" : "read");
  const [draft, setDraft] = useState<MomDraft | null>(mom ? toDraft(mom) : null);
  const [confirm, setConfirm] = useState(false);

  if (!mom || !draft) return <EmptyState title="MOM tidak ditemukan" />;
  const current: Mom = mom;
  const dirty = JSON.stringify(clean(draft)) !== JSON.stringify(toDraft(mom));
  const at = () => stamp(today);
  const save = (silent = false) => run((s) => saveMom(s, mom.id, clean(draft), actor, at()), silent ? undefined : "MOM tersimpan.");

  function publish() {
    if (dirty && !save(true)) return;
    if (run((s) => publishMom(s, current.id, actor, at()), "MOM dipublikasikan. Peserta mendapat notifikasi.")) setMode("read");
  }

  function toTask(itemId: string, boardId: string) {
    const taskId = newId("task");
    if (run((s) => actionItemToTask(s, current.id, itemId, boardId, actor, at(), taskId), "Action item dijadikan task.")) {
      setDraft((d) => (d ? { ...d, actionItems: d.actionItems.map((a) => (a.id === itemId ? { ...a, taskId } : a)) } : d));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`${base}/mom`} className="mr-auto inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"><Icon icon={ArrowLeft} size={14} /> Semua MOM</Link>
        {mom.status === "published" ? <Badge tone="success" dot>Published</Badge> : <Badge dot>Draft</Badge>}
        {dirty && <span className="text-xs text-warning">Belum disimpan</span>}
        {editable && <Tabs variant="pill" value={mode} onChange={setMode} tabs={[{ value: "edit", label: "Edit" }, { value: "read", label: "Baca" }]} />}
        <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Printer} size={14} />} onClick={() => { setMode("read"); window.setTimeout(() => window.print(), 50); }}>Cetak</Button>
        {editable && (
          <>
            <Button size="small" variant="ghost" tone="danger" iconLeft={<Icon icon={Trash2} size={14} />} onClick={() => setConfirm(true)}>Hapus</Button>
            <Button size="small" variant="secondary" tone="neutral" disabled={!dirty} onClick={() => save()}>Simpan</Button>
            {mom.status === "draft" && <Button size="small" iconLeft={<Icon icon={Send} size={14} />} onClick={publish}>Publish</Button>}
          </>
        )}
      </div>
      {mode === "edit" && editable ? (
        <MomEditor mom={mom} draft={draft} data={data} onChange={setDraft} onToTask={toTask}
          onAttach={(f) => run((s) => addMomAttachment(s, mom.id, f, actor, at()), `Lampiran ${f.name} ditambahkan.`)} />
      ) : (
        <MomDocument mom={{ ...mom, ...clean(draft) }} data={data} />
      )}
      <ConfirmDialog
        open={confirm} onOpenChange={setConfirm} title={`Hapus "${mom.title}"?`}
        onConfirm={() => { if (run((s) => deleteMom(s, mom.id, actor, at()), "MOM dihapus.")) router.push(`${base}/mom`); }}
      />
    </div>
  );
}
