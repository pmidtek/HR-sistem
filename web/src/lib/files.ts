/**
 * File dari clipboard (screenshot Mac: Cmd+Ctrl+Shift+4, Windows: Win+Shift+S) biasanya bernama "image.png".
 * Diberi nama yang jelas supaya mudah dikenali Finance: screenshot-20261018-093015.png
 */
export function nameClipboardFiles(files: File[], now: Date = new Date()): File[] {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return files.map((f, i) => {
    const generic = !f.name || /^image\.(png|jpe?g|gif|webp|heic)$/i.test(f.name);
    if (!generic) return f;
    const ext = (f.type.split("/")[1] ?? "png").replace("jpeg", "jpg");
    return new File([f], `screenshot-${stamp}${files.length > 1 ? `-${i + 1}` : ""}.${ext}`, { type: f.type });
  });
}

/** Hanya gambar & PDF yang boleh dilampirkan. */
export const isReceiptFile = (f: File) => f.type.startsWith("image/") || f.type === "application/pdf";
