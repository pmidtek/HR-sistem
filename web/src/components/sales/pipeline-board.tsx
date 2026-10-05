"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { STAGES } from "@/lib/mock/sales";
import { formatDate, formatRupiah } from "@/lib/format";
import type { Opportunity, OpportunityStage } from "@/lib/types";
import { useLookups } from "../hooks";
import { Avatar } from "../ui/display";

type Props = {
  items: Opportunity[];
  companyName: (id: string) => string;
  editable: boolean;
  onOpen: (o: Opportunity) => void;
  onMove: (o: Opportunity, stage: OpportunityStage) => void;
};

/** Kanban per tahap dengan drag & drop. */
export function PipelineBoard({ items, companyName, editable, onOpen, onMove }: Props) {
  const { userName } = useLookups();
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const list = items.filter((o) => o.stage === stage.id);
        const total = list.reduce((s, o) => s + o.value, 0);
        return (
          <div
            key={stage.id}
            onDragOver={(e) => { if (editable) { e.preventDefault(); setOver(stage.id); } }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              setOver(null);
              const o = items.find((x) => x.id === e.dataTransfer.getData("text/plain"));
              if (o && o.stage !== stage.id) onMove(o, stage.id);
            }}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-s bg-sunken p-2 shadow-[inset_0_0_0_1px_var(--border-default)]",
              over === stage.id && "shadow-[inset_0_0_0_1px_var(--brand)]",
            )}
          >
            <div className="flex items-center justify-between px-2 py-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                {stage.name}
                <span className="font-mono text-[11px] text-fg-subtle">{list.length}</span>
              </span>
              <span className="font-mono text-[11px] text-fg-muted">{formatRupiah(total)}</span>
            </div>
            <div className="flex flex-col gap-2">
              {list.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  draggable={editable}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)}
                  onClick={() => onOpen(o)}
                  className="flex flex-col gap-2 rounded-xs glass p-3 text-left shadow-[inset_0_0_0_1px_var(--border-default)] transition-[transform,box-shadow] duration-[200ms] hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-sm)]"
                >
                  <span className="font-mono text-[10px] text-fg-brand">{o.code}</span>
                  <span className="text-sm leading-snug text-fg">{o.name}</span>
                  <span className="text-xs text-fg-muted">{companyName(o.companyId)}</span>
                  <span className="flex items-center justify-between">
                    <span className="font-serif text-lg">{formatRupiah(o.value)}</span>
                    <Avatar name={userName(o.ownerId)} size="small" />
                  </span>
                  <span className="flex justify-between font-mono text-[10px] text-fg-subtle">
                    <span>{o.probability}%</span>
                    <span>{formatDate(o.expectedClose)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
