"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { canEdit } from "@/lib/access";
import { STAGES } from "@/lib/mock/sales";
import { formatDate, formatRupiah } from "@/lib/format";
import type { Opportunity } from "@/lib/types";
import { useAuthed } from "@/store/app-provider";
import { moveOpportunity } from "@/store/actions-business";
import { useLookups } from "@/components/hooks";
import { CreateProjectDialog } from "@/components/sales/create-project-dialog";
import { OpportunityDialog } from "@/components/sales/opportunity-dialog";
import { PipelineBoard } from "@/components/sales/pipeline-board";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";

type View = "board" | "table" | "ready" | "companies";
type Draft = Omit<Opportunity, "id" | "code"> & { id?: string; code?: string };

export default function SalesPage() {
  const { state, user, team, today, run } = useAuthed();
  const { userName } = useLookups();
  const editable = canEdit(user, team, "sales");
  const [view, setView] = useState<View>("board");
  const [owner, setOwner] = useState("");
  const [company, setCompany] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [converting, setConverting] = useState<Opportunity | null>(null);

  const companyName = (id: string) => state.companies.find((c) => c.id === id)?.name ?? "-";
  const items = state.opportunities.filter((o) => (!owner || o.ownerId === owner) && (!company || o.companyId === company));
  const ready = state.opportunities.filter((o) => o.stage === "won" && !state.projects.some((p) => p.opportunityId === o.id));
  const owners = [...new Set(state.opportunities.map((o) => o.ownerId))];
  const stageName = (id: string) => STAGES.find((s) => s.id === id)?.name ?? id;

  const newDraft = (): Draft => ({ name: "", companyId: "", ownerId: team?.kind === "sales" ? user.id : "", value: 0, stage: "lead", probability: 10, expectedClose: today, lostReason: null });

  return (
    <>
      <PageHeader
        title="Sales"
        accent="pipeline."
        description="Setiap opportunity otomatis mendapat kode OPYYXXXX yang bisa dipakai di timesheet."
        actions={editable && <Button iconLeft={<Icon icon={Plus} />} onClick={() => setEditing(newDraft())}>Opportunity baru</Button>}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <Tabs value={view} onChange={setView} tabs={[{ value: "board", label: "Kanban" }, { value: "table", label: "Tabel" }, { value: "ready", label: "Siap Dijadikan Project", count: ready.length }, { value: "companies", label: "Company" }]} />
        {(view === "board" || view === "table") && (
          <div className="flex gap-2">
            <Select value={owner} placeholder="Semua sales" onChange={(e) => setOwner(e.target.value)} options={owners.map((o) => ({ value: o, label: userName(o) }))} />
            <Select value={company} placeholder="Semua company" onChange={(e) => setCompany(e.target.value)} options={state.companies.map((c) => ({ value: c.id, label: c.name }))} />
          </div>
        )}
      </div>

      {view === "board" && (
        <PipelineBoard
          items={items}
          companyName={companyName}
          editable={editable}
          onOpen={(o) => editable && setEditing(o)}
          onMove={(o, stage) => (stage === "lost" ? setEditing({ ...o, stage, probability: 0 }) : run((s) => moveOpportunity(s, o.id, stage), `${o.code} dipindah ke ${stageName(stage)}.`))}
        />
      )}

      {view === "table" && (
        <Table>
          <thead><tr><Th>Kode</Th><Th>Opportunity</Th><Th>Company</Th><Th>PIC</Th><Th>Tahap</Th><Th className="text-right">Nilai</Th><Th className="text-right">Prob.</Th><Th>Closing</Th></tr></thead>
          <tbody>
            {items.map((o) => (
              <Tr key={o.id} className={editable ? "cursor-pointer" : undefined} onClick={() => editable && setEditing(o)}>
                <Td className="font-mono text-xs text-fg-brand">{o.code}</Td>
                <Td>{o.name}</Td>
                <Td className="text-fg-muted">{companyName(o.companyId)}</Td>
                <Td className="text-fg-muted">{userName(o.ownerId)}</Td>
                <Td><Badge tone={o.stage === "won" ? "success" : o.stage === "lost" ? "danger" : "neutral"}>{stageName(o.stage)}</Badge></Td>
                <Td className="text-right font-mono text-xs">{formatRupiah(o.value)}</Td>
                <Td className="text-right font-mono text-xs">{o.probability}%</Td>
                <Td className="text-xs">{formatDate(o.expectedClose)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {view === "ready" && (ready.length === 0 ? <EmptyState title="Semua opportunity Won sudah punya project" /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ready.map((o) => (
            <Card key={o.id} className="flex flex-col gap-3">
              <span className="font-mono text-[11px] text-fg-brand">{o.code}</span>
              <p className="font-display text-base font-medium">{o.name}</p>
              <p className="text-sm text-fg-muted">{companyName(o.companyId)} · {userName(o.ownerId)}</p>
              <p className="font-serif text-2xl">{formatRupiah(o.value)}</p>
              {(user.role === "stakeholder" || team?.kind === "sales") && <Button size="small" onClick={() => setConverting(o)}>Buat Project</Button>}
            </Card>
          ))}
        </div>
      ))}

      {view === "companies" && (
        <Table>
          <thead><tr><Th>Company</Th><Th>Industri</Th><Th>Website</Th><Th>PIC</Th><Th className="text-right">Opportunity</Th></tr></thead>
          <tbody>
            {state.companies.map((c) => (
              <Tr key={c.id}>
                <Td>{c.name}</Td>
                <Td className="text-fg-muted">{c.industry}</Td>
                <Td className="text-fg-muted">{c.website}</Td>
                <Td className="text-xs">{c.contacts.map((p) => <p key={p.email}>{p.name} · {p.title}<br /><span className="text-fg-subtle">{p.email} · {p.phone}</span></p>)}</Td>
                <Td className="text-right font-mono text-xs">{state.opportunities.filter((o) => o.companyId === c.id).length}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && <OpportunityDialog key={editing.id ?? "new"} initial={editing} onClose={() => setEditing(null)} />}
      {converting && <CreateProjectDialog key={converting.id} opportunity={converting} onClose={() => setConverting(null)} />}
    </>
  );
}
