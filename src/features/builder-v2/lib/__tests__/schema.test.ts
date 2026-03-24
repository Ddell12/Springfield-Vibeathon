import { describe, expect, it } from "vitest";

import { FragmentSchema, FragmentTemplate } from "../schema";

describe("FragmentTemplate", () => {
  it("accepts valid template values", () => {
    const valid = ["nextjs-developer", "vue-developer", "html-developer"];
    for (const v of valid) {
      expect(() => FragmentTemplate.parse(v)).not.toThrow();
    }
  });

  it("rejects unknown template values", () => {
    expect(() => FragmentTemplate.parse("react-developer")).toThrow();
    expect(() => FragmentTemplate.parse("")).toThrow();
    expect(() => FragmentTemplate.parse("unknown")).toThrow();
  });
});

describe("FragmentSchema", () => {
  const validFragment = {
    title: "Morning Routine App",
    description: "An interactive morning routine tracker for children",
    template: "nextjs-developer",
    code: "export default function App() { return <div>Hello</div>; }",
    file_path: "app/page.tsx",
    has_additional_dependencies: false,
  };

  it("parses a valid fragment with required fields", () => {
    const result = FragmentSchema.parse(validFragment);
    expect(result.title).toBe("Morning Routine App");
    expect(result.template).toBe("nextjs-developer");
    expect(result.has_additional_dependencies).toBe(false);
  });

  it("defaults port to 3000 when not provided", () => {
    const result = FragmentSchema.parse(validFragment);
    expect(result.port).toBe(3000);
  });

  it("accepts a custom port", () => {
    const result = FragmentSchema.parse({ ...validFragment, port: 8080 });
    expect(result.port).toBe(8080);
  });

  it("accepts optional additional_dependencies", () => {
    const result = FragmentSchema.parse({
      ...validFragment,
      has_additional_dependencies: true,
      additional_dependencies: ["framer-motion", "zustand"],
    });
    expect(result.additional_dependencies).toEqual(["framer-motion", "zustand"]);
  });

  it("allows missing additional_dependencies when has_additional_dependencies is false", () => {
    const result = FragmentSchema.parse(validFragment);
    expect(result.additional_dependencies).toBeUndefined();
  });

  it("rejects missing required title", () => {
    const { title: _title, ...rest } = validFragment;
    expect(() => FragmentSchema.parse(rest)).toThrow();
  });

  it("rejects missing required description", () => {
    const { description: _desc, ...rest } = validFragment;
    expect(() => FragmentSchema.parse(rest)).toThrow();
  });

  it("rejects missing required template", () => {
    const { template: _tmpl, ...rest } = validFragment;
    expect(() => FragmentSchema.parse(rest)).toThrow();
  });

  it("rejects missing required code", () => {
    const { code: _code, ...rest } = validFragment;
    expect(() => FragmentSchema.parse(rest)).toThrow();
  });

  it("rejects missing required file_path", () => {
    const { file_path: _fp, ...rest } = validFragment;
    expect(() => FragmentSchema.parse(rest)).toThrow();
  });

  it("rejects an invalid template enum value", () => {
    expect(() =>
      FragmentSchema.parse({ ...validFragment, template: "angular-developer" })
    ).toThrow();
  });

  it("parses all three template types", () => {
    for (const template of ["nextjs-developer", "vue-developer", "html-developer"] as const) {
      const result = FragmentSchema.parse({ ...validFragment, template });
      expect(result.template).toBe(template);
    }
  });
});
