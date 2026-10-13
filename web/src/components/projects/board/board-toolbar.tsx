"use client";

import { Layers, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { activeFilterCount, emptyFilters, type TaskFilters } from "@/lib/calc/project";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/form";
import { Icon } from "../../ui/icon";
import { Menu } from "../../ui/menu";
import { Tabs } from "../../ui/tabs";
import { priorityLabel } from "../task-bits";
import type { ProjectData } from "../use-project-data";
import { useProject } from "../workspace/context";

export type BoardView = "kanban" | "list" | "gantt";
export type BoardDialogMode = "create" | "rename" | "delete";

type Props = {
  data: ProjectData;
  boardId: string;
  onBoard: (id: string) => void;
  view: BoardView;
  onView: (v: BoardView) => void;
  filters: TaskFilters;
  onFilters: (f: TaskFilters) => void;
  onBoardDialog: (m: BoardDialogMode) => void;
  onEpics: () => void;
  onNewTask: () => void;
};

const sel = "h-8 rounded-xxs bg-sunken px-2 text-xs text-fg shadow-[inset_0_0_0_1px_var(--border-default)]";

export function BoardToolbar({ data, boardId, onBoard, view, onView, filters: f, onFilters, onBoardDialog, onEpics, onNewTask }: Props) {
  const { canEdit, canManage } = useProject();
  const set = <K extends keyof TaskFilters>(k: K, v: TaskFilters[K]) => onFilters({ ...f, [k]: v });
  const active = activeFilterCount(f) + (f.query ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {view !== "gantt" && (
          data.boards.length <= 4 ? (
            <Tabs variant="pill" value={boardId} onChange={onBoard} tabs={data.boards.map((b) => ({ value: b.id, label: b.name }))} />
          ) : (
            <select className={`${sel} h-9 text-sm`} value={boardId} onChange={(e) => onBoard(e.target.value)} aria-label="Pilih board">
              {data.boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )
        )}
        {canManage && view !== "gantt" && (
          <>
            <Button size="small" variant="ghost" tone="neutral" iconLeft={<Icon icon={Plus} size={14} />} onClick={() => onBoardDialog("create")}>Board</Button>
            <Menu label="Menu board" align="start" items={[
              { label: "Ganti nama board", icon: Pencil, onSelect: () => onBoardDialog("rename") },
              { label: "Hapus board", icon: Trash2, danger: true, onSelect: () => onBoardDialog("delete"), hidden: data.boards.length <= 1 },
            ]} />
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Tabs variant="pill" value={view} onChange={onView} tabs={[{ value: "kanban", label: "Kanban" }, { value: "list", label: "List" }, { value: "gantt", label: "Gantt" }]} />
          <Button size="small" variant="secondary" tone="neutral" iconLeft={<Icon icon={Layers} size={14} />} onClick={onEpics}>Epic</Button>
          {canEdit && <Button size="small" iconLeft={<Icon icon={Plus} size={14} />} onClick={onNewTask}>Task</Button>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <Icon icon={Search} size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-subtle" />
          <input value={f.query} onChange={(e) => set("query", e.target.value)} placeholder="Cari judul atau #nomor" aria-label="Cari task" className={`${sel} w-52 pl-8`} />
        </label>
        <select className={sel} value={f.assigneeId} onChange={(e) => set("assigneeId", e.target.value)} aria-label="Filter assignee">
          <option value="">Semua assignee</option>
          <option value="none">Tanpa assignee</option>
          {data.memberOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select className={sel} value={f.priority} onChange={(e) => set("priority", e.target.value)} aria-label="Filter prioritas">
          <option value="">Semua prioritas</option>
          {Object.entries(priorityLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={sel} value={f.labelId} onChange={(e) => set("labelId", e.target.value)} aria-label="Filter label">
          <option value="">Semua label</option>
          {data.labelOptions.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select className={sel} value={f.epicId} onChange={(e) => set("epicId", e.target.value)} aria-label="Filter epic">
          <option value="">Semua epic</option>
          {data.epics.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <Switch checked={f.onlyMine} onChange={(v) => set("onlyMine", v)} label="Hanya task saya" />
        {active > 0 && (
          <button type="button" onClick={() => onFilters(emptyFilters)} className="inline-flex items-center gap-1 text-xs text-fg-brand hover:underline">
            <Icon icon={X} size={12} /> Reset filter ({active})
          </button>
        )}
      </div>
    </div>
  );
}
