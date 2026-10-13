"use client";

import type { ReactNode } from "react";
import { attentionTasks, crSummary, daysLeft, daysOverdue, isDeliverableLate, milestoneState, progressOf, refLabel, taskRef } from "@/lib/calc/project";
import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { crStatusLabel } from "@/store/actions-changes";
import { deliverableStatusLabel } from "@/store/actions-plan";
import { useLookups } from "../../hooks";
import { projectStatusLabel } from "../../status-badge";
import { useProject } from "../workspace/context";
import type { ProjectData } from "../use-project-data";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 break-inside-avoid">
      <h2 className="border-b border-line pb-1 font-display text-base font-medium">{title}</h2>
      {children}
    </section>
  );
}

const th = "py-1.5 pr-3 text-left text-xs font-normal text-fg-muted";
const td = "py-1.5 pr-3 align-top";

/** Laporan ringkas project, rapi di layar dan saat dicetak. */
export function ProjectReport({ data }: { data: ProjectData }) {
  const { state, today } = useAuthed();
  const { project } = useProject();
  const { userName, teamName } = useLookups();
  const prog = progressOf(data.tasks, data.doneCols);
  const risks = attentionTasks(data.tasks, data.doneCols, today);
  const milestones = state.milestones.filter((m) => m.projectId === project.id).sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const deliverables = state.deliverables.filter((d) => d.projectId === project.id);
  const crs = state.changeRequests.filter((c) => c.projectId === project.id).sort((a, b) => a.number - b.number);
  const sum = crSummary(crs);
  const left = daysLeft(project.targetDate, today);
  const company = state.companies.find((c) => c.id === project.companyId);
  const facts: [string, string][] = [
    ["Status", projectStatusLabel[project.status]],
    ["Klien", company?.name ?? "Internal"],
    ["Lead", userName(project.leadId)],
    ["Tim", project.teamIds.map(teamName).join(", ")],
    ["Periode", `${formatDate(project.startDate)} – ${formatDate(project.targetDate)}`],
    ["Sisa waktu", left >= 0 ? `${left} hari` : `terlambat ${-left} hari`],
  ];

  return (
    <article className="glass mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-m p-8 text-sm shadow-[inset_0_0_0_1px_var(--border-default)] print:max-w-none print:bg-white print:p-0 print:text-black print:shadow-none">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-[11px] tracking-[0.08em] text-fg-subtle uppercase">Laporan project · {formatDate(today)}</p>
        <h1 className="font-display text-2xl font-medium">{project.code} — {project.name}</h1>
        {project.description && <p className="text-fg-muted">{project.description}</p>}
      </header>
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[120px_1fr_120px_1fr]">
        {facts.map(([k, v]) => (<div key={k} className="contents"><dt className="text-fg-muted">{k}</dt><dd>{v}</dd></div>))}
      </dl>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Progress", `${prog.percent}%`], ["Task selesai", `${prog.done}/${prog.total}`], ["Perlu perhatian", String(risks.length)], ["CR disetujui", `${sum.approved} (+${sum.extraDays} hr)`]].map(([k, v]) => (
          <div key={k} className="rounded-xs bg-sunken p-3 print:border print:border-neutral-300"><p className="text-xs text-fg-muted">{k}</p><p className="font-serif text-2xl">{v}</p></div>
        ))}
      </div>
      <Section title="Milestone">
        <table className="w-full"><thead><tr><th className={th}>Milestone</th><th className={th}>Target</th><th className={th}>Status</th></tr></thead>
          <tbody>{milestones.map((m) => { const st = milestoneState(m, today); return (
            <tr key={m.id} className="border-t border-line"><td className={td}>{m.name}</td><td className={td}>{formatDate(m.targetDate)}</td><td className={td}>{st === "done" ? "Selesai" : st === "late" ? "Terlambat" : "Belum"}</td></tr>
          ); })}</tbody>
        </table>
      </Section>
      <Section title="Risiko & task perlu perhatian">
        {risks.length === 0 ? <p className="text-fg-muted">Tidak ada task terlambat atau blocked.</p> : (
          <ul className="flex flex-col gap-1">
            {risks.map((t) => (
              <li key={t.id}><span className="font-mono text-xs">{taskRef(t)}</span> {t.title} — {t.blocked ? `blocked (${t.blockedReason ?? "-"})` : ""}{t.blocked && daysOverdue(t, today) ? ", " : ""}{daysOverdue(t, today) ? `terlambat ${daysOverdue(t, today)} hari` : ""} · {userName(t.assigneeIds[0] ?? null)}</li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Deliverable">
        <table className="w-full"><thead><tr><th className={th}>Deliverable</th><th className={th}>Status</th><th className={th}>Deadline</th></tr></thead>
          <tbody>{deliverables.map((d) => (
            <tr key={d.id} className="border-t border-line"><td className={td}>{d.title}</td><td className={td}>{deliverableStatusLabel[d.status]}</td><td className={td}>{d.deadline ? formatDate(d.deadline) : "–"}{isDeliverableLate(d, today) ? " (terlambat)" : ""}</td></tr>
          ))}</tbody>
        </table>
      </Section>
      <Section title="Change request">
        {crs.length === 0 ? <p className="text-fg-muted">Tidak ada CR.</p> : (
          <table className="w-full"><thead><tr><th className={th}>No.</th><th className={th}>Judul</th><th className={th}>Dampak</th><th className={th}>Status</th></tr></thead>
            <tbody>{crs.map((c) => (
              <tr key={c.id} className="border-t border-line"><td className={`${td} font-mono text-xs`}>{refLabel("CR", c.number)}</td><td className={td}>{c.title}</td><td className={td}>+{c.impactDays} hr</td><td className={td}>{crStatusLabel[c.status]}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Section>
    </article>
  );
}
