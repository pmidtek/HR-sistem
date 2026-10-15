import { describe, expect, it } from "vitest";
import { matchCategory, parseIdr, parseLooseDate, parsePastedRows } from "./reimburse-paste";

const cats = [
  { id: "transportation", name: "Transportation" },
  { id: "subscriptions", name: "Subscriptions" },
  { id: "meals-expenses", name: "Meals Expenses" },
];

describe("tempel dari Excel", () => {
  it("format tanggal umum", () => {
    expect(parseLooseDate("8-Sep-26")).toBe("2026-09-08");
    expect(parseLooseDate("11 Okt 2026")).toBe("2026-10-11");
    expect(parseLooseDate("08/09/2026")).toBe("2026-09-08");
    expect(parseLooseDate("2026-9-8")).toBe("2026-09-08");
    expect(parseLooseDate("kemarin")).toBeNull();
  });

  it("kategori toleran salah ketik", () => {
    expect(matchCategory("Tansportation", cats)).toBe("transportation");
    expect(matchCategory("meals expenses", cats)).toBe("meals-expenses");
    expect(matchCategory("Hotel", cats)).toBe("");
  });

  it("nominal Rupiah", () => {
    expect(parseIdr("300.000")).toBe(300_000);
    expect(parseIdr(" 401,944 ")).toBe(401_944);
    expect(parseIdr("-")).toBe(0);
  });

  it("baris dari form perusahaan (dengan kolom No & header)", () => {
    const text = [
      "No\tDATE\tDESCRIPTION\tCATEGORY\tCODE\tCOST (USD)\tCOST (IDR)",
      "1\t8-Sep-26\tTIket Whoosh Pergi\tTansportation\t\t -\t300.000",
      "8\t8-Sep-26\tClaude\tSubscriptions\t\t$22.00\t401.944",
    ].join("\n");
    const rows = parsePastedRows(text, cats, "2026-10-07");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ date: "2026-09-08", description: "TIket Whoosh Pergi", categoryId: "transportation", projectCode: null, amountUsdCents: null, amount: 300_000, files: [] });
    expect(rows[1]).toMatchObject({ categoryId: "subscriptions", amountUsdCents: 2200, amount: 401_944 });
  });
});
