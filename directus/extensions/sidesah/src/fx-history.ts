/**
 * Kurs USD → IDR per tanggal transaksi (mis. struk 8 Okt memakai kurs 8 Okt).
 *   GET /sidesah/fx/rate?date=YYYY-MM-DD
 * Akhir pekan / libur → kurs hari kerja terakhir sebelumnya (aturan ECB).
 * Hasil disimpan di tabel fx_rates supaya tanggal yang sama tidak diambil berulang dari internet.
 */
import type { Router } from "express";
import { bad, route, today, ymd, type Ctx } from "./lib/context";

type Row = { rate: number; rate_date: string | Date | null; source: string | null };

async function fromEcb(date: string): Promise<{ rate: number; rateDate: string; source: string }> {
  const res = await fetch(`https://api.frankfurter.dev/v1/${date}?base=USD&symbols=IDR`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`ECB ${res.status}`);
  const j = (await res.json()) as { date: string; rates: { IDR?: number } };
  if (!j.rates.IDR) throw new Error("No IDR rate");
  return { rate: Math.round(j.rates.IDR), rateDate: j.date, source: "ECB reference rate" };
}

export async function usdRateOn(ctx: Ctx, date: string): Promise<{ date: string; rate: number; rateDate: string | null; source: string | null }> {
  const key = `USD/IDR:${date}`;
  const cached = await ctx.database("fx_rates").where({ unique_key: key }).first<Row | undefined>("rate", "rate_date", "source");
  if (cached) return { date, rate: cached.rate, rateDate: ymd(cached.rate_date) || null, source: cached.source };
  const fx = await fromEcb(date);
  // Kurs hari ini bisa berubah (belum terbit) → jangan disimpan permanen.
  if (date < today()) {
    await ctx.database("fx_rates").insert({ id: crypto.randomUUID(), date, pair: "USD/IDR", rate: fx.rate, rate_date: fx.rateDate, source: fx.source, unique_key: key }).onConflict("unique_key").ignore();
  }
  return { date, rate: fx.rate, rateDate: fx.rateDate, source: fx.source };
}

export function fxRoutes(router: Router, ctx: Ctx) {
  router.get("/fx/rate", route(ctx, async (req) => {
    const date = String(req.query.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw bad("Date must be YYYY-MM-DD.");
    if (date > today()) throw bad("Date can't be in the future.");
    if (date < "1999-01-04") throw bad("Date is too old.");
    try {
      return await usdRateOn(ctx, date);
    } catch {
      throw bad("Exchange rate for this date is not available right now. Enter the IDR amount manually.");
    }
  }));
}
