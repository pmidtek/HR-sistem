"use client";

import { CheckCircle2, Palette, Pencil, Trash2 } from "lucide-react";
import type { BoardColumn } from "@/lib/types";
import { Menu } from "../../ui/menu";
import type { ColumnDialogMode } from "./column-dialog";

export function ColumnMenu({ column, onOpen, onToggleDone }: { column: BoardColumn; onOpen: (mode: ColumnDialogMode) => void; onToggleDone: () => void }) {
  return (
    <Menu
      label={`Menu kolom ${column.name}`}
      items={[
        { label: "Ganti nama", icon: Pencil, onSelect: () => onOpen("rename") },
        { label: "Ubah warna", icon: Palette, onSelect: () => onOpen("color") },
        { label: column.isDone ? "Bukan kolom selesai" : "Tandai kolom selesai", icon: CheckCircle2, onSelect: onToggleDone },
        { label: "Hapus kolom", icon: Trash2, danger: true, onSelect: () => onOpen("delete") },
      ]}
    />
  );
}
