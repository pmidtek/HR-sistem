import { describe, expect, it } from "vitest";
import { directDownloadUrl } from "./mutations";

describe("directDownloadUrl", () => {
  it("Google Drive share link → link unduhan", () => {
    expect(directDownloadUrl("https://drive.google.com/file/d/1AbC-xyz_9/view?usp=sharing")).toBe("https://drive.google.com/uc?export=download&id=1AbC-xyz_9");
    expect(directDownloadUrl("https://drive.google.com/open?id=1AbC")).toBe("https://drive.google.com/uc?export=download&id=1AbC");
  });
  it("Dropbox dl=0 → dl=1", () => {
    expect(directDownloadUrl("https://www.dropbox.com/s/abc/struk.pdf?dl=0")).toBe("https://www.dropbox.com/s/abc/struk.pdf?dl=1");
    expect(directDownloadUrl("https://www.dropbox.com/s/abc/struk.pdf")).toBe("https://www.dropbox.com/s/abc/struk.pdf?dl=1");
  });
  it("link lain tidak diubah", () => {
    expect(directDownloadUrl(" https://example.com/a.png ")).toBe("https://example.com/a.png");
  });
});
