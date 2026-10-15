import { reimburseStatusLabel } from "@/lib/calc/approval";
import { paymentState } from "@/lib/calc/reimburse";
import type { Reimbursement } from "@/lib/types";

/** Ekspor per baris transaksi (format mirip form Excel perusahaan) ke CSV yang bisa dibuka di Excel. */
export function exportReimburseCsv(list: Reimbursement[], userName: (id: string) => string, categoryName: (id: string) => string, fileName: string) {
  const head = ["Claim no.", "Employee", "Title", "Date", "Description", "Category", "Code", "Cost (USD)", "Cost (IDR)", "Declined reason", "Status", "Payment", "Paid on", "Receipts", "Payment proof"];
  const rows = list.flatMap((r) => {
    const p = paymentState(r.status);
    return r.items.map((i) => [
      r.number, userName(r.userId), r.title, i.date, i.description, categoryName(i.categoryId), i.projectCode ?? "",
      i.amountUsdCents === null ? "" : (i.amountUsdCents / 100).toFixed(2), String(i.amount), i.declined ? i.declined.note : "",
      reimburseStatusLabel[r.status], p === "paid" ? "Paid" : p === "unpaid" ? "Not paid" : "-", r.paidAt ?? "", i.files.map((f) => f.name).join("; "), r.payment?.proofFiles.map((f) => f.name).join("; ") ?? "",
    ]);
  });
  const csv = [head, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv" }));
  a.download = fileName;
  a.click();
}
