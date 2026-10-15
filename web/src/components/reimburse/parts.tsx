import { FileImage } from "lucide-react";
import { paymentState, type Stage } from "@/lib/calc/reimburse";
import { formatDate } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { Badge } from "../ui/display";
import { Icon } from "../ui/icon";

/** $22.00 dari sen. */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Warna & label tiap tahap alur reimburse (dipakai infografik, tabel, dan dashboard). */
export const stageMeta: Record<Stage, { label: string; short: string; color: string }> = {
  finance: { label: "Review Finance", short: "Review Finance", color: "var(--chart-2)" },
  stakeholder: { label: "Approval Stakeholder", short: "Approval", color: "#a78bfa" },
  revision: { label: "Perlu revisi", short: "Revisi", color: "#94a3b8" },
  unpaid: { label: "Disetujui, belum dibayar", short: "Siap dibayar", color: "var(--warning)" },
  paid: { label: "Sudah dibayar", short: "Dibayar", color: "var(--success)" },
  rejected: { label: "Ditolak", short: "Ditolak", color: "var(--danger)" },
};

/** Status pembayaran: Dibayar (tanggal) / Belum dibayar / "-" jika belum disetujui. */
export function PaymentBadge({ r }: { r: Reimbursement }) {
  const p = paymentState(r.status);
  if (p === "paid") return <Badge tone="success" dot>Dibayar{r.paidAt ? ` ${formatDate(r.paidAt)}` : ""}</Badge>;
  if (p === "unpaid") return <Badge tone="warning" dot>Belum dibayar</Badge>;
  return <span className="text-xs text-fg-subtle">-</span>;
}

export function ProjectCode({ code }: { code: string | null }) {
  if (!code) return <span className="text-fg-subtle">-</span>;
  return <span className="font-mono text-xs text-fg-brand">{code === "OTHERS" ? "Others" : code}</span>;
}

export function FileChips({ files }: { files: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {files.map((f, i) => (
        <span key={`${f}-${i}`} title={f} className="inline-flex max-w-36 items-center gap-1 rounded-xxs bg-sunken px-1.5 py-0.5 text-[11px] text-fg-muted">
          <Icon icon={FileImage} size={11} /> <span className="truncate">{f}</span>
        </span>
      ))}
    </div>
  );
}
