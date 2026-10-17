import { describe, expect, it } from "vitest";
import { isReceiptFile, nameClipboardFiles } from "./files";

describe("nameClipboardFiles", () => {
  const now = new Date(2026, 9, 18, 9, 30, 15);
  it("screenshot dari clipboard diberi nama bertanggal", () => {
    const [f] = nameClipboardFiles([new File(["x"], "image.png", { type: "image/png" })], now);
    expect(f.name).toBe("screenshot-20261018-093015.png");
  });
  it("beberapa screenshot diberi nomor", () => {
    const out = nameClipboardFiles([new File(["a"], "image.png", { type: "image/png" }), new File(["b"], "image.jpeg", { type: "image/jpeg" })], now);
    expect(out.map((f) => f.name)).toEqual(["screenshot-20261018-093015-1.png", "screenshot-20261018-093015-2.jpg"]);
  });
  it("file bernama asli tidak diubah", () => {
    const [f] = nameClipboardFiles([new File(["x"], "struk-grab.pdf", { type: "application/pdf" })], now);
    expect(f.name).toBe("struk-grab.pdf");
  });
  it("hanya gambar & PDF", () => {
    expect(isReceiptFile(new File(["x"], "a.png", { type: "image/png" }))).toBe(true);
    expect(isReceiptFile(new File(["x"], "a.zip", { type: "application/zip" }))).toBe(false);
  });
});
