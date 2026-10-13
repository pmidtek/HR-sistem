"use client";

import { Paperclip } from "lucide-react";
import { taskRef } from "@/lib/calc/project";
import { formatDate } from "@/lib/format";
import type { Mom } from "@/lib/project-types";
import { useLookups } from "../../hooks";
import { Icon } from "../../ui/icon";
import { Markdown } from "../../ui/markdown";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

/** Tampilan baca MOM, rapi untuk dicetak (print CSS: latar putih, tanpa navigasi). */
export function MomDocument({ mom, data }: { mom: Mom; data: ProjectData }) {
  const { project } = useProject();
  const { userName } = useLookups();
  const meta: [string, string][] = [
    ["Project", `${project.code} — ${project.name}`],
    ["Tanggal", formatDate(mom.meetingDate)],
    ["Peserta internal", mom.attendeeIds.map((id) => userName(id)).join(", ") || "–"],
    ["Peserta eksternal", mom.externalAttendees.join(", ") || "–"],
    ["Penulis", userName(mom.authorId)],
  ];
  return (
    <article className="mom-document glass mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-m p-8 shadow-[inset_0_0_0_1px_var(--border-default)] print:max-w-none print:bg-white print:p-0 print:text-black print:shadow-none">
      <header className="flex flex-col gap-3 border-b border-line pb-5">
        <p className="font-mono text-[11px] tracking-[0.08em] text-fg-subtle uppercase">Minutes of Meeting · {mom.status === "published" ? "Published" : "Draft"}</p>
        <h1 className="font-display text-2xl font-medium">{mom.title}</h1>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[140px_1fr]">
          {meta.map(([k, v]) => (<div key={k} className="contents"><dt className="text-fg-muted">{k}</dt><dd>{v}</dd></div>))}
        </dl>
      </header>
      <Markdown className="text-[15px] text-fg">{mom.body}</Markdown>
      {mom.actionItems.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-base font-medium">Action item</h2>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-fg-muted"><th className="py-2 pr-3 font-normal">Tindak lanjut</th><th className="py-2 pr-3 font-normal">PIC</th><th className="py-2 pr-3 font-normal">Due</th><th className="py-2 font-normal">Status</th></tr></thead>
            <tbody>
              {mom.actionItems.map((a) => {
                const task = a.taskId ? data.taskById.get(a.taskId) : undefined;
                return (
                  <tr key={a.id} className="border-b border-line align-top">
                    <td className="py-2 pr-3">{a.text}{task && <span className="ml-1 font-mono text-xs text-fg-brand">{taskRef(task)}</span>}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.assigneeId ? userName(a.assigneeId) : "–"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.dueDate ? formatDate(a.dueDate) : "–"}</td>
                    <td className="py-2 whitespace-nowrap">{a.done ? "Selesai" : "Terbuka"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </section>
      )}
      {mom.attachments.length > 0 && (
        <section className="flex flex-col gap-1 text-sm">
          <h2 className="font-display text-base font-medium">Lampiran</h2>
          {mom.attachments.map((f) => <p key={f.id} className="flex items-center gap-2 text-fg-muted"><Icon icon={Paperclip} size={14} />{f.name}</p>)}
        </section>
      )}
    </article>
  );
}
