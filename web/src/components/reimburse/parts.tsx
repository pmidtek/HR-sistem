import { paymentState, type Stage } from "@/lib/calc/reimburse";
import { formatDate } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";
import { Badge } from "../ui/display";

/** $22.00 dari sen. */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Warna & label tiap tahap alur reimburse (dipakai infografik, tabel, dan dashboard). */
export const stageMeta: Record<Stage, { label: string; short: string; color: string }> = {
  finance: { label: "In review (PIC / Finance)", short: "In review", color: "var(--chart-2)" },
  stakeholder: { label: "Stakeholder approval", short: "Approval", color: "#a78bfa" },
  revision: { label: "Needs revision", short: "Revision", color: "#94a3b8" },
  unpaid: { label: "Approved, not paid yet", short: "Ready to pay", color: "var(--warning)" },
  paid: { label: "Paid", short: "Paid", color: "var(--success)" },
  rejected: { label: "Rejected", short: "Rejected", color: "var(--danger)" },
};

/** Status pembayaran: Paid (tanggal) / Not paid / "-" jika belum disetujui. */
export function PaymentBadge({ r }: { r: Reimbursement }) {
  const p = paymentState(r.status);
  if (p === "paid") return <Badge tone="success" dot>Paid{r.paidAt ? ` ${formatDate(r.paidAt)}` : ""}</Badge>;
  if (p === "unpaid") return <Badge tone="warning" dot>Not paid</Badge>;
  return <span className="text-xs text-fg-subtle">-</span>;
}

export function ProjectCode({ code }: { code: string | null }) {
  if (!code) return <span className="text-fg-subtle">-</span>;
  return <span className="font-mono text-xs text-fg-brand">{code === "OTHERS" ? "Others" : code}</span>;
}
