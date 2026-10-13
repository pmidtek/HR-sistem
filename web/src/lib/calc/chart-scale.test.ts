import { describe, expect, it } from "vitest";
import { niceTicks } from "./chart-scale";

describe("tick sumbu grafik", () => {
  it("angka bulat mulai 0 dan menutup nilai maksimum", () => {
    expect(niceTicks(11)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
