import { reimburseStatusLabel } from "@/lib/calc/approval";
import { paymentState } from "@/lib/calc/reimburse";
import type { Reimbursement } from "@/lib/types";

/** Ekspor per baris transaksi (format mirip form Excel perusahaan) ke CSV yang bisa dibuka di Excel. */
export function exportReimburseCsv(list: Reimbursement[], userName: (id: string) => string, categoryName: (id: string) => string, fileName: string) {
  const head = ["No. Pengajuan", "Pegawai", "Judul", "Date", "Description", "Category", "Code", "Cost (USD)", "Cost (IDR)", "Baris ditolak", "Status", "Pembayaran", "Tanggal bayar", "Bukti"];
  const rows = list.flatMap((r) => {
    const p = paymentState(r.status);
    return r.items.map((i) => [
      r.number, userName(r.userId), r.title, i.date, i.description, categoryName(i.categoryId), i.projectCode ?? "",
      i.amountUsdCents === null ? "" : (i.amountUsdCents / 100).toFixed(2), String(i.amount), i.declined ? i.declined.note : "",
      reimburseStatusLabel[r.status], p === "paid" ? "Sudah dibayar" : p === "unpaid" ? "Belum dibayar" : "-", r.paidAt ?? "", i.files.join("; "),
    ]);
  });
  const csv = [head, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv" }));
  a.download = fileName;
  a.click();
}
