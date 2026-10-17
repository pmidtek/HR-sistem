/**
 * Kurs USD → IDR otomatis untuk reimburse.
 * Sumber utama: kurs referensi ECB (api.frankfurter.dev, gratis, tanpa API key; terbit tiap hari kerja).
 * Cadangan: open.er-api.com. Kalau dua-duanya gagal, kurs lama tetap dipakai.
 * Hanya berjalan jika `reimburse_usd_rate_auto` aktif; Finance tetap bisa mengisi manual.
 */
import type { Ctx } from "./lib/context";

export type FxResult = { rate: number; source: string; date: string };

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export async function fetchUsdIdr(): Promise<FxResult> {
  try {
    const j = (await getJson("https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR")) as { date: string; rates: { IDR?: number } };
    if (j.rates.IDR) return { rate: Math.round(j.rates.IDR), source: "ECB reference rate", date: j.date };
  } catch {
    // coba cadangan
  }
  const j = (await getJson("https://open.er-api.com/v6/latest/USD")) as { time_last_update_utc?: string; rates?: { IDR?: number } };
  if (!j.rates?.IDR) throw new Error("No IDR rate from any source.");
  return { rate: Math.round(j.rates.IDR), source: "ExchangeRate-API", date: new Date(j.time_last_update_utc ?? Date.now()).toISOString().slice(0, 10) };
}

/** Ambil kurs terbaru dan simpan ke app_settings. `force` = jalan walau mode otomatis mati (tombol "Refresh now"). */
export async function refreshUsdRate(ctx: Ctx, force = false): Promise<FxResult | null> {
  const s = await ctx.database("app_settings").first<{ id: string; reimburse_usd_rate_auto: boolean } | undefined>("id", "reimburse_usd_rate_auto");
  if (!s || (!force && !s.reimburse_usd_rate_auto)) return null;
  const fx = await fetchUsdIdr();
  if (fx.rate < 1000 || fx.rate > 100_000) throw new Error(`Rate looks wrong: ${fx.rate}`);
  await ctx.database("app_settings").where({ id: s.id }).update({
    reimburse_usd_rate: fx.rate, reimburse_usd_rate_updated_at: new Date().toISOString(), reimburse_usd_rate_source: `${fx.source} (${fx.date})`,
  });
  return fx;
}
