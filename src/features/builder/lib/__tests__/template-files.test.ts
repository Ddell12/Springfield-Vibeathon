import { getPublishableTemplateFiles } from "../template-files";

describe("getPublishableTemplateFiles", () => {
  it("returns an array", () => {
    const files = getPublishableTemplateFiles();
    expect(Array.isArray(files)).toBe(true);
  });

  it("each entry has file and data string fields", () => {
    const files = getPublishableTemplateFiles();
    for (const f of files) {
      expect(typeof f.file).toBe("string");
      expect(typeof f.data).toBe("string");
    }
  });

  it("does not include src/App.tsx (placeholder replaced by generated code)", () => {
    const files = getPublishableTemplateFiles();
    const paths = files.map((f) => f.file);
    expect(paths).not.toContain("src/App.tsx");
  });
});
