"use client";

import { ExternalLink } from "lucide-react";
import type { ClientContactRole } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { setContactRole } from "@/store/actions-client";
import { stamp } from "@/store/project-core";
import { useLookups } from "@/components/hooks";
import { KeyActions } from "@/components/projects/client/key-actions";
import { Touchpoints } from "@/components/projects/client/touchpoints";
import { useProjectData } from "@/components/projects/use-project-data";
import { useQueryParam } from "@/components/projects/use-query-param";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";
import { Avatar, Card, EmptyState } from "@/components/ui/display";
import { Icon } from "@/components/ui/icon";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";

type Tab = "touchpoints" | "actions" | "stakeholders";
const TABS: Tab[] = ["touchpoints", "actions", "stakeholders"];
const contactRoleLabel: Record<ClientContactRole, string> = { decision_maker: "Pengambil keputusan", user: "Pengguna", technical: "Teknis", finance: "Keuangan", other: "Lainnya" };

export default function ClientPage() {
  const { state, actor, today, run } = useAuthed();
  const { project, canEdit } = useProject();
  const { userName } = useLookups();
  const data = useProjectData();
  const [tabParam, setTabParam] = useQueryParam("tab");
  const tab: Tab = TABS.find((t) => t === tabParam) ?? "touchpoints";
  const company = state.companies.find((c) => c.id === project.companyId);
  const opportunity = state.opportunities.find((o) => o.id === project.opportunityId);

  if (!company) return <EmptyState title="Project internal, tidak terhubung ke klien." description="Hubungkan project ke klien dari menu Settings." />;
  const openActions = state.keyActions.filter((k) => k.projectId === project.id && k.status === "open").length;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Client" description="Interaksi, tindak lanjut, dan stakeholder di sisi klien." />
      <Card className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="min-w-48">
          <p className="font-display text-lg font-medium">{company.name}</p>
          <p className="text-xs text-fg-muted">{company.industry}</p>
        </div>
        <a href={`https://${company.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-fg-brand hover:underline">{company.website} <Icon icon={ExternalLink} size={12} /></a>
        {opportunity && (
          <div className="text-sm">
            <p className="text-xs text-fg-muted">Opportunity asal</p>
            <p><span className="font-mono text-fg-brand">{opportunity.code}</span> · {opportunity.name}</p>
          </div>
        )}
        {opportunity && (
          <div className="flex items-center gap-2 text-sm">
            <Avatar name={userName(opportunity.ownerId)} size="small" />
            <span><span className="block text-xs text-fg-muted">PIC sales</span>{userName(opportunity.ownerId)}</span>
          </div>
        )}
      </Card>
      <Tabs value={tab} onChange={(t) => setTabParam(t)} tabs={[
        { value: "touchpoints", label: "Touchpoints", count: state.touchpoints.filter((t) => t.projectId === project.id).length },
        { value: "actions", label: "Key Actions", count: openActions },
        { value: "stakeholders", label: "Stakeholders", count: company.contacts.length },
      ]} />
      {tab === "touchpoints" && <Touchpoints company={company} data={data} />}
      {tab === "actions" && <KeyActions data={data} />}
      {tab === "stakeholders" && (
        <Table>
          <thead><tr><Th>Nama</Th><Th>Jabatan</Th><Th>Email</Th><Th>Telepon</Th><Th>Peran di project</Th></tr></thead>
          <tbody>
            {company.contacts.map((c) => {
              const role = project.clientContactRoles[c.id];
              return (
                <Tr key={c.id}>
                  <Td><span className="flex items-center gap-2"><Avatar name={c.name} size="small" />{c.name}</span></Td>
                  <Td className="text-xs text-fg-muted">{c.title}</Td>
                  <Td className="text-xs"><a href={`mailto:${c.email}`} className="text-fg-brand hover:underline">{c.email}</a></Td>
                  <Td className="font-mono text-xs whitespace-nowrap text-fg-muted">{c.phone}</Td>
                  <Td>
                    {canEdit ? (
                      <select className="h-8 rounded-xxs bg-sunken px-2 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border-default)]" aria-label={`Peran ${c.name}`} value={role ?? ""}
                        onChange={(e) => run((s) => setContactRole(s, project.id, c.id, (e.target.value || null) as ClientContactRole | null, actor, stamp(today)), "Peran diperbarui.")}>
                        <option value="">Belum ditentukan</option>
                        {Object.entries(contactRoleLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    ) : <span className="text-xs text-fg-muted">{role ? contactRoleLabel[role] : "–"}</span>}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
