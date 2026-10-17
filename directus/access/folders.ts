/** Folder penyimpanan file di Directus (ID tetap, dipakai frontend saat upload). */
export const FOLDER = {
  receipts: "5e5a0002-0000-4000-8000-000000000001",
  paymentProofs: "5e5a0002-0000-4000-8000-000000000002",
  companyAssets: "5e5a0002-0000-4000-8000-000000000003",
} as const;

export const folders = [
  { id: FOLDER.receipts, name: "Reimbursement receipts" },
  { id: FOLDER.paymentProofs, name: "Reimbursement payment proofs" },
  { id: FOLDER.companyAssets, name: "Company assets" },
];
