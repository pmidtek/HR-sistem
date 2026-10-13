"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useAuthed } from "@/store/app-provider";
import { createMom } from "@/store/actions-mom";
import { stamp } from "@/store/project-core";
import { newId } from "@/store/state";
import { useLookups } from "@/components/hooks";
import { useQueryParam } from "@/components/projects/use-query-param";
import { useProject } from "@/components/projects/workspace/context";
import { SectionHeader } from "@/components/projects/workspace/section-header";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/display";
import { Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { rowClass, Table, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";

type Filter = "all" | "draft" | "published";

export default function MomListPage() {
  const { state, actor, today, run } = useAuthed();
  const { project, base, canEdit } = useProject();
  const { userName } = useLookups();
  const router = useRouter();
  const [newParam] = useQueryParam("new");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const moms = state.moms.filter((m) => m.projectId === project.id).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
  const list = moms.filter((m) => (filter === "all" || m.status === filter) && (!q || m.title.toLowerCase().includes(q.toLowerCase())));

  function create() {
    const id = newId("mom");
    if (run((s) => createMom(s, project.id, actor, today, stamp(today), id), "Draft MOM dibuat.")) router.push(`${base}/mom/${id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Minutes of Meeting"
        description="Catatan rapat beserta action item. Action item bisa langsung dijadikan task."
        actions={canEdit && <Button size="small" iconLeft={<Icon icon={Plus} size={14} />} onClick={create}>MOM baru</Button>}
      />
      {newParam === "1" && canEdit && (
        <div className="flex items-center justify-between gap-3 rounded-s bg-brand-subtle px-4 py-3 text-sm">
          <span>Buat MOM baru untuk rapat hari ini?</span>
          <Button size="small" onClick={create}>Buat draft</Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          variant="pill"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "Semua", count: moms.length },
            { value: "draft", label: "Draft", count: moms.filter((m) => m.status === "draft").length },
            { value: "published", label: "Published", count: moms.filter((m) => m.status === "published").length },
          ]}
        />
        <div className="w-64"><Input size="small" placeholder="Cari judul MOM" value={q} onChange={(e) => setQ(e.target.value)} iconLeft={<Icon icon={Search} size={14} />} /></div>
      </div>
      {list.length === 0 ? (
        <EmptyState title="Tidak ada MOM" description="Buat MOM setelah rapat supaya keputusan dan tindak lanjut tercatat." />
      ) : (
        <Table>
          <thead><tr><Th>Judul</Th><Th>Tanggal rapat</Th><Th>Penulis</Th><Th className="text-right">Action item</Th><Th>Status</Th></tr></thead>
          <Stagger as="tbody">
            {list.map((m, i) => {
              const done = m.actionItems.filter((a) => a.done).length;
              return (
                <StaggerItem as="tr" key={m.id} index={i} className={cn(rowClass, "cursor-pointer")} onClick={() => router.push(`${base}/mom/${m.id}`)}>
                  <Td className="min-w-56">{m.title}</Td>
                  <Td className="text-xs whitespace-nowrap text-fg-muted">{formatDate(m.meetingDate)}</Td>
                  <Td className="text-xs whitespace-nowrap text-fg-muted">{userName(m.authorId)}</Td>
                  <Td className="text-right font-mono text-xs">{done}/{m.actionItems.length}</Td>
                  <Td>{m.status === "published" ? <Badge tone="success" dot>Published</Badge> : <Badge dot>Draft</Badge>}</Td>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Table>
      )}
    </div>
  );
}
