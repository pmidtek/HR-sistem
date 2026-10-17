import { describe, expect, it } from "vitest";
import { ymd } from "./context";

describe("ymd", () => {
  it("Date tengah malam lokal tetap tanggal yang sama (tidak mundur ke UTC)", () => {
    expect(ymd(new Date(2026, 9, 8, 0, 0, 0))).toBe("2026-10-08");
  });
  it("string & kosong", () => {
    expect(ymd("2026-10-08T00:00:00")).toBe("2026-10-08");
    expect(ymd(null)).toBe("");
  });
});
