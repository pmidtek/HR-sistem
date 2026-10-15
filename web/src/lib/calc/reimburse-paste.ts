import type { ReimbursementCategory } from "../types";
import { normalizeProjectCode, parseUsdCents, type ReimburseRowInput } from "./reimburse";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, agu: 8, agt: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "8-Sep-26", "08/09/2026", "2026-09-08", "8 Sep 2026" → "2026-09-08"; gagal → null. */
export function parseLooseDate(raw: string): string | null {
  const v = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(v);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = /^(\d{1,2})[\s-]([a-zA-Z]{3})[a-zA-Z]*[\s-](\d{2,4})$/.exec(v);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (!mon) return null;
    return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${pad(mon)}-${pad(+m[1])}`;
  }
  return null;
}

const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Cocokkan nama kategori dengan toleransi salah ketik kecil ("Tansportation" → Transportation). */
export function matchCategory(raw: string, categories: ReimbursementCategory[]): string {
  const q = letters(raw);
  if (!q) return "";
  const exact = categories.find((c) => letters(c.name) === q);
  if (exact) return exact.id;
  const close = categories.find((c) => distance(letters(c.name), q) <= 2);
  return close?.id ?? "";
}

function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** "300.000" / "Rp 401,944" / "-" → integer Rupiah (0 jika kosong). */
export function parseIdr(raw: string): number {
  return Number(raw.replace(/\D/g, "")) || 0;
}

/**
 * Tempel dari Excel. Kolom mengikuti form perusahaan:
 * [No], Date, Description, Category, Code, Cost (USD), Cost (IDR). Kolom "No" boleh ada/tidak.
 */
export function parsePastedRows(text: string, categories: ReimbursementCategory[], today: string): ReimburseRowInput[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((cells) => cells.length >= 3 && cells.some((c) => c.trim() !== ""))
    // Lewati baris judul kolom.
    .filter((cells) => !cells.some((c) => /^(date|tanggal)$/i.test(c.trim())))
    .map((cells) => (/^\d+$/.test(cells[0].trim()) && cells.length >= 6 ? cells.slice(1) : cells))
    .map(([date = "", description = "", category = "", code = "", usd = "", idr = ""]) => {
      const usdCents = usd.trim() === "-" ? null : parseUsdCents(usd);
      return {
        date: parseLooseDate(date) ?? today,
        description: description.trim(),
        categoryId: matchCategory(category, categories),
        projectCode: normalizeProjectCode(code),
        amountUsdCents: usdCents && usdCents > 0 ? usdCents : null,
        amount: parseIdr(idr),
        files: [],
      };
    });
}
