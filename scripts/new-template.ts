import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const name = process.argv[2];

if (!name) {
  console.error("Usage: npx tsx scripts/new-template.ts <kebab-case-name>");
  console.error("Example: npx tsx scripts/new-template.ts word-flashcard");
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error("Template name must be kebab-case (lowercase letters, numbers, hyphens)");
  process.exit(1);
}

const pascal = name
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join("");

const displayName = name
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join(" ");

const registryKey = name.replace(/-/g, "_");
const TARGET_DIR = path.join(ROOT, "src/features/tools/lib/templates", name);

if (fs.existsSync(TARGET_DIR)) {
  console.error(`Template already exists: ${TARGET_DIR}`);
  process.exit(1);
}

fs.mkdirSync(TARGET_DIR, { recursive: true });

fs.writeFileSync(
  path.join(TARGET_DIR, "schema.ts"),
  `import { z } from "zod";

// TODO: Define the configuration shape for this template.
// Add a field for every user-configurable property.
export const ${pascal}ConfigSchema = z.object({
  title: z.string().min(1).max(100).default("New ${displayName}"),
  highContrast: z.boolean().default(false),
  // Add fields here
});

export type ${pascal}Config = z.infer<typeof ${pascal}ConfigSchema>;
`
);

fs.writeFileSync(
  path.join(TARGET_DIR, "editor.tsx"),
  `"use client";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
// TODO: import additional components from @/shared/components/ui/ as needed

import type { EditorProps } from "../../registry";
import type { ${pascal}Config } from "./schema";

export function ${pascal}Editor({ config, onChange }: EditorProps<${pascal}Config>) {
  const set = <K extends keyof ${pascal}Config>(key: K, value: ${pascal}Config[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={config.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="${displayName} title"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="high-contrast">High contrast</Label>
        <Switch
          id="high-contrast"
          checked={config.highContrast}
          onCheckedChange={(v) => set("highContrast", v)}
        />
      </div>

      {/* TODO: Add editor controls for your config fields */}
    </div>
  );
}
`
);

fs.writeFileSync(
  path.join(TARGET_DIR, "runtime.tsx"),
  `"use client";

// DESIGN: Child-friendly therapy app
// ─────────────────────────────────────────────────────────────────────────
// Touch targets:  minimum 60×60px  (use h-16 min-w-[60px] on buttons)
// Text size:      minimum 18px (text-lg), prefer 20–24px for primary content
// Colors:         bright and saturated — not muted or neutral
// Shapes:         rounded-2xl or rounded-full — approachable, not sharp
// Feedback:       every tap must produce an immediate visible response
// Sounds:         no autoplay — only trigger audio on explicit user action
// Animations:     off by default — do not add motion without an opt-in switch
// Fitzgerald AAC: yellow=people, green=verbs, blue=descriptors, orange=nouns
// ─────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";

import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
// TODO: import additional components as needed — available:
// accordion, alert, aspect-ratio, avatar, badge, breadcrumb, calendar,
// carousel, checkbox, collapsible, command, dialog, drawer, dropdown-menu,
// form, hover-card, input, label, navigation-menu, popover, progress,
// radio-group, resizable, scroll-area, select, separator, sheet, skeleton,
// slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip

import type { RuntimeProps } from "../../registry";
import { PremiumScreen } from "../../runtime/premium-primitives";
import type { ${pascal}Config } from "./schema";

export function ${pascal}Runtime({
  config,
  mode: _mode,
  onEvent,
  voice: _voice,
}: RuntimeProps<${pascal}Config>) {
  useEffect(() => {
    onEvent("app_opened");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PremiumScreen title={config.title}>
      {/* TODO: Replace with your therapy tool UI */}
      <div className="flex flex-col items-center gap-6 p-4">
        <Card className="w-full rounded-2xl p-8 text-center">
          <p className="text-xl font-semibold text-foreground">{config.title}</p>
          <p className="mt-2 text-muted-foreground">
            Replace this placeholder with the tool UI.
          </p>
        </Card>
        <Button
          className="h-16 min-w-[200px] rounded-2xl text-lg font-bold"
          onClick={() => onEvent("action_triggered")}
        >
          Tap me
        </Button>
      </div>
    </PremiumScreen>
  );
}
`
);

console.log(`
✅ ${pascal} template scaffolded

Files created:
  src/features/tools/lib/templates/${name}/schema.ts
  src/features/tools/lib/templates/${name}/editor.tsx
  src/features/tools/lib/templates/${name}/runtime.tsx

Add the following to src/features/tools/lib/registry.ts:
──────────────────────────────────────────────────────────────────

// ── Imports (add with other imports) ──────────────────────────
import { ${pascal}Editor } from "./templates/${name}/editor";
import { ${pascal}Runtime } from "./templates/${name}/runtime";
import { type ${pascal}Config, ${pascal}ConfigSchema } from "./templates/${name}/schema";

// ── Default config (add before templateRegistry) ──────────────
const DEFAULT_${registryKey.toUpperCase()}_CONFIG: ${pascal}Config = ${pascal}ConfigSchema.parse({});

// ── Registry entry (add inside templateRegistry object) ───────
  ${registryKey}: {
    meta: {
      id: "${registryKey}",
      name: "${displayName}",
      description: "TODO: one-line description of what this tool does",
      intendedFor: "TODO: describe the child population and therapy goal",
      estimatedSetupMinutes: 5,
    },
    Editor: ${pascal}Editor,
    Runtime: ${pascal}Runtime,
    defaultConfig: DEFAULT_${registryKey.toUpperCase()}_CONFIG,
    parseConfig: (json: string) => ${pascal}ConfigSchema.parse(JSON.parse(json)),
    shell: {
      ...DEFAULT_APP_SHELL,
      themePreset: "calm",
      enableSounds: true,
      enableDifficulty: false,
      instructionsText: "TODO: instructions shown to the child",
    },
    aiConfigSchema: z.object({}).passthrough(),
    schemaPrompt: "TODO: specific AI guidance for generating this template config",
  },

──────────────────────────────────────────────────────────────────

Next steps:
  1. Fill in schema.ts fields
  2. Add editor controls for each config field
  3. Implement runtime UI (follow design rules in runtime.tsx header)
  4. Update meta.description, meta.intendedFor, shell.instructionsText, schemaPrompt in registry.ts
  5. Run: npm test
`);
