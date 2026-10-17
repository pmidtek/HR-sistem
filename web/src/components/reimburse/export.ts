import { reimburseStatusLabel } from "@/lib/calc/approval";
import { claimMonth, monthlyByEmployee, paymentState, reimbursed, sumItemsBy } from "@/lib/calc/reimburse";
import { formatPeriod } from "@/lib/format";
import type { Reimbursement } from "@/lib/types";

/** Unduh tabel sebagai CSV (dengan BOM supaya Excel membaca UTF-8). */
function downloadCsv(rows: string[][], fileName: string) {
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv" }));
  a.download = fileName;
  a.click();
}

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
  downloadCsv([head, ...rows], fileName);
}

/** Rekap bulanan: satu baris = satu pegawai di satu bulan, dengan kolom nominal per kategori. */
export function exportMonthlyRecapCsv(
  list: Reimbursement[], months: string[], categories: { id: string; name: string }[],
  userName: (id: string) => string, teamOf: (userId: string) => string, fileName: string,
) {
  const head = ["Employee", "Team", "Month", "Claims", "Submitted (IDR)", "Declined (IDR)", "Reimbursed (IDR)", "In review", "Not paid", "Paid", ...categories.map((c) => c.name)];
  const rows = monthlyByEmployee(list, months).flatMap((e) =>
    months.filter((m) => e.months.has(m)).map((m) => {
      const t = e.months.get(m)!;
      const byCat = sumItemsBy(list.filter((r) => r.userId === e.userId && claimMonth(r) === m), (i) => i.categoryId);
      return [
        userName(e.userId), teamOf(e.userId), formatPeriod(m), String(t.count), String(t.total), String(t.declined), String(reimbursed(t)),
        String(t.inProcess), String(t.unpaid), String(t.paid), ...categories.map((c) => String(byCat.get(c.id)?.amount ?? 0)),
      ];
    }),
  );
  downloadCsv([head, ...rows], fileName);
}
