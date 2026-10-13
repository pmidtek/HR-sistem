import type { Company, Opportunity } from "../types";

/** Klien. Kontak dipakai sebagai stakeholder di menu Client project. */
export const companies: Company[] = [
  { id: "c1", name: "PT Maju Bersama", industry: "Retail", website: "majubersama.co.id", contacts: [
    { id: "ct1", name: "Agus Salim", title: "IT Manager", email: "agus@majubersama.co.id", phone: "0812-1111-2222" },
    { id: "ct2", name: "Rosa Amelia", title: "Head of Operations", email: "rosa@majubersama.co.id", phone: "0812-1111-3333" },
  ] },
  { id: "c2", name: "PT Sinar Logistik", industry: "Logistik", website: "sinarlogistik.id", contacts: [
    { id: "ct3", name: "Wulan Sari", title: "COO", email: "wulan@sinarlogistik.id", phone: "0813-2222-3333" },
    { id: "ct4", name: "Bambang Hidayat", title: "Finance Manager", email: "bambang@sinarlogistik.id", phone: "0813-2222-4444" },
    { id: "ct5", name: "Citra Melati", title: "IT Lead", email: "citra@sinarlogistik.id", phone: "0813-2222-5555" },
    { id: "ct6", name: "Doni Saputra", title: "Staff Finance", email: "doni@sinarlogistik.id", phone: "0813-2222-6666" },
  ] },
  { id: "c3", name: "Bank Nusantara Digital", industry: "Perbankan", website: "bnd.co.id", contacts: [
    { id: "ct7", name: "Teguh Prakoso", title: "VP Digital", email: "teguh@bnd.co.id", phone: "0811-3333-4444" },
  ] },
  { id: "c4", name: "PT Agro Lestari", industry: "Agrikultur", website: "agrolestari.com", contacts: [
    { id: "ct8", name: "Nina Hapsari", title: "Head of Data", email: "nina@agrolestari.com", phone: "0815-4444-5555" },
  ] },
  { id: "c5", name: "Klinik Sehat Sentosa", industry: "Kesehatan", website: "sehatsentosa.id", contacts: [
    { id: "ct9", name: "dr. Yudi", title: "Owner", email: "yudi@sehatsentosa.id", phone: "0816-5555-6666" },
  ] },
];

/** Modul Sales ditunda; opportunity tetap ada sebagai asal project (kode OP). */
export const opportunities: Opportunity[] = [
  { id: "o1", code: "OP260012", name: "Sistem POS Multi-cabang", companyId: "c1", ownerId: "u5", value: 450_000_000, stage: "negotiation", probability: 75, expectedClose: "2026-10-28", lostReason: null },
  { id: "o2", code: "OP260015", name: "Tracking Armada Real-time", companyId: "c2", ownerId: "u5", value: 780_000_000, stage: "proposal", probability: 50, expectedClose: "2026-11-15", lostReason: null },
  { id: "o3", code: "OP260018", name: "Mobile Banking Revamp", companyId: "c3", ownerId: "u9", value: 1_600_000_000, stage: "qualification", probability: 25, expectedClose: "2026-12-20", lostReason: null },
  { id: "o4", code: "OP260019", name: "Dashboard Prediksi Panen", companyId: "c4", ownerId: "u9", value: 320_000_000, stage: "lead", probability: 10, expectedClose: "2027-01-31", lostReason: null },
  { id: "o5", code: "OP260007", name: "Portal Pembayaran B2B", companyId: "c2", ownerId: "u5", value: 520_000_000, stage: "won", probability: 100, expectedClose: "2026-06-30", lostReason: null },
  { id: "o6", code: "OP260009", name: "Aplikasi Reservasi Pasien", companyId: "c5", ownerId: "u9", value: 210_000_000, stage: "won", probability: 100, expectedClose: "2026-09-30", lostReason: null },
  { id: "o7", code: "OP260004", name: "Data Warehouse Retail", companyId: "c1", ownerId: "u5", value: 380_000_000, stage: "won", probability: 100, expectedClose: "2026-05-15", lostReason: null },
  { id: "o8", code: "OP260011", name: "Chatbot Layanan Nasabah", companyId: "c3", ownerId: "u9", value: 260_000_000, stage: "lost", probability: 0, expectedClose: "2026-08-31", lostReason: "Klien memilih vendor dengan harga lebih rendah." },
];
