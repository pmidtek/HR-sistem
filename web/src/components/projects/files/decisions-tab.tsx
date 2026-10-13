"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { refLabel } from "@/lib/calc/project";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Decision, DecisionStatus } from "@/lib/project-types";
import { useAuthed } from "@/store/app-provider";
import { useLookups } from "../../hooks";
import { Button } from "../../ui/button";
import { Badge, EmptyState, type BadgeTone } from "../../ui/display";
import { Icon } from "../../ui/icon";
import { Stagger, StaggerItem } from "../../ui/motion";
import { rowClass, Table, Td, Th } from "../../ui/table";
import { useProject } from "../workspace/context";
import { DecisionSheet, decisionStatusLabel } from "./decision-sheet";

const tone: Record<DecisionStatus, BadgeTone> = { proposed: "warning", accepted: "success", rejected: "danger", superseded: "neutral", deprecated: "neutral" };

/** Decision Register: DR-001 … dengan status, kategori, dan siapa yang memutuskan. */
export function DecisionsTab() {
  const { state } = useAuthed();
  const { project, canEdit } = useProject();
  const { userName } = useLookups();
  const [open, setOpen] = useState<Decision | "new" | null>(null);
  const list = state.decisions.filter((d) => d.projectId === project.id).sort((a, b) => b.number - a.number);

  return (
    <div className="flex flex-col gap-4">
      {canEdit && <Button size="small" className="self-end" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => setOpen("new")}>Catat keputusan</Button>}
      {list.length === 0 ? <EmptyState title="Belum ada keputusan" description="Catat keputusan penting supaya alasannya tidak hilang." /> : (
        <Table>
          <thead><tr><Th>No.</Th><Th>Judul</Th><Th>Kategori</Th><Th>Status</Th><Th>Diputuskan oleh</Th><Th>Tanggal</Th></tr></thead>
          <Stagger as="tbody">
            {list.map((d, i) => (
              <StaggerItem as="tr" key={d.id} index={i} className={cn(rowClass, "cursor-pointer")} onClick={() => setOpen(d)}>
                <Td className="font-mono text-xs text-fg-brand">{refLabel("DR", d.number)}</Td>
                <Td className={cn("min-w-56", (d.status === "superseded" || d.status === "deprecated") && "text-fg-subtle line-through")}>{d.title}</Td>
                <Td className="text-xs text-fg-muted">{d.category || "–"}</Td>
                <Td><Badge tone={tone[d.status]} dot>{decisionStatusLabel[d.status]}</Badge></Td>
                <Td className="text-xs whitespace-nowrap text-fg-muted">{d.decidedById ? userName(d.decidedById) : "–"}</Td>
                <Td className="text-xs whitespace-nowrap text-fg-muted">{d.decidedAt ? formatDate(d.decidedAt) : "–"}</Td>
              </StaggerItem>
            ))}
          </Stagger>
        </Table>
      )}
      {open && <DecisionSheet key={open === "new" ? "new" : open.id} decision={open === "new" ? null : open} onClose={() => setOpen(null)} />}
    </div>
  );
}
