# WAB Component Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a TypeScript component registry that closes two gaps in the config-driven template engine: 13 missing shadcn/ui components and no child-friendly design contract for AI config generation and new template authoring.

**Architecture:** A single source of truth (`src/features/tools/lib/component-registry.ts`) exports `COMPONENT_REGISTRY` (40 entries), `TEMPLATE_DESIGN_RULES`, and `registryToPrompt()`. The AI generation prompt (`src/features/tools/lib/ai/premium-prompt.ts`) imports and injects the design rules directly — no Convex boundary involved; AI generation runs in Next.js API routes, not Convex. A scaffold script (`scripts/new-template.ts`) stamps out new template stubs pre-loaded with child-friendly design guidance.

**Tech Stack:** shadcn/ui (new-york style, `components.json` routes to `src/shared/components/ui/`), Tailwind v4, TypeScript, Vitest, tsx (for scripts)

---

## File Map

| Status | Path | Role |
|--------|------|------|
| Add ×13 | `src/shared/components/ui/{slider,carousel,...}.tsx` | Missing shadcn components |
| **Create** | `src/features/tools/lib/component-registry.ts` | Registry, design rules, prompt serializer |
| **Create** | `src/features/tools/lib/__tests__/component-registry.test.ts` | Registry sanity checks |
| **Create** | `scripts/new-template.ts` | Template scaffold generator |
| Modify | `src/features/tools/lib/ai/premium-prompt.ts` | Inject `TEMPLATE_DESIGN_RULES` |
| Modify | `src/features/tools/lib/ai/__tests__/premium-prompt.test.ts` | Update assertions for new prompt |
| Modify | `src/features/tools/lib/registry.ts` | Enhance `schemaPrompt` per template |

---

### Task 1: Add 13 missing shadcn/ui components

**Files:**
- Create: `src/shared/components/ui/slider.tsx` (and 12 others via CLI)

- [ ] **Step 1: Install components via shadcn CLI**

Run each command and accept any prompts (components.json pre-configures the output path to `src/shared/components/ui/`):

```bash
npx shadcn@latest add slider
npx shadcn@latest add carousel
npx shadcn@latest add drawer
npx shadcn@latest add calendar
npx shadcn@latest add collapsible
npx shadcn@latest add table
npx shadcn@latest add command
npx shadcn@latest add form
npx shadcn@latest add alert
npx shadcn@latest add aspect-ratio
npx shadcn@latest add hover-card
npx shadcn@latest add navigation-menu
npx shadcn@latest add breadcrumb
```

If any command installs new npm peer deps, run `pnpm install` before continuing.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/ui/ pnpm-lock.yaml package.json
git commit -m "feat: add 13 missing shadcn/ui components (slider, carousel, drawer, calendar, collapsible, table, command, form, alert, aspect-ratio, hover-card, navigation-menu, breadcrumb)"
```

---

### Task 2: Write failing tests for component-registry

**Files:**
- Create: `src/features/tools/lib/__tests__/component-registry.test.ts`

- [ ] **Step 1: Create the test file**

`src/features/tools/lib/__tests__/component-registry.test.ts`:
```typescript
import { describe, expect, it } from "vitest";

import {
  COMPONENT_REGISTRY,
  TEMPLATE_DESIGN_RULES,
  registryToPrompt,
} from "../component-registry";

describe("COMPONENT_REGISTRY", () => {
  it("has no duplicate names", () => {
    const names = COMPONENT_REGISTRY.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has no duplicate importPaths", () => {
    const paths = COMPONENT_REGISTRY.map((c) => c.importPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every entry has a non-empty name", () => {
    for (const c of COMPONENT_REGISTRY) {
      expect(c.name.length, `entry has empty name`).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty importPath", () => {
    for (const c of COMPONENT_REGISTRY) {
      expect(c.importPath.length, `${c.name} has empty importPath`).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty therapyUse", () => {
    for (const c of COMPONENT_REGISTRY) {
      expect(c.therapyUse.length, `${c.name} has empty therapyUse`).toBeGreaterThan(0);
    }
  });

  it("all importPaths use the shared/components/ui prefix", () => {
    for (const c of COMPONENT_REGISTRY) {
      expect(c.importPath, `${c.name} wrong prefix`).toMatch(
        /^@\/shared\/components\/ui\//
      );
    }
  });

  it("has at least 40 components", () => {
    expect(COMPONENT_REGISTRY.length).toBeGreaterThanOrEqual(40);
  });
});

describe("TEMPLATE_DESIGN_RULES", () => {
  it("has at least 10 rules", () => {
    expect(TEMPLATE_DESIGN_RULES.length).toBeGreaterThanOrEqual(10);
  });

  it("every rule has a non-empty rule and rationale", () => {
    for (const r of TEMPLATE_DESIGN_RULES) {
      expect(r.rule.length).toBeGreaterThan(0);
      expect(r.rationale.length).toBeGreaterThan(0);
    }
  });
});

describe("registryToPrompt", () => {
  it("contains the Available UI Components section", () => {
    expect(registryToPrompt()).toContain("## Available UI Components");
  });

  it("contains the Child & Autism-Friendly Design Rules section", () => {
    expect(registryToPrompt()).toContain("## Child & Autism-Friendly Design Rules");
  });

  it("contains every component name in the output", () => {
    const prompt = registryToPrompt();
    for (const c of COMPONENT_REGISTRY) {
      expect(prompt, `prompt missing ${c.name}`).toContain(c.name);
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/features/tools/lib/__tests__/component-registry.test.ts
```

Expected: All tests fail with `Cannot find module '../component-registry'`

---

### Task 3: Implement component-registry.ts

**Files:**
- Create: `src/features/tools/lib/component-registry.ts`

- [ ] **Step 1: Create the registry file**

`src/features/tools/lib/component-registry.ts`:
```typescript
export type ComponentEntry = {
  name: string;
  importPath: string;
  description: string;
  therapyUse: string;
  props?: string;
};

export type DesignRule = {
  rule: string;
  rationale: string;
};

export const COMPONENT_REGISTRY: ComponentEntry[] = [
  {
    name: "Accordion",
    importPath: "@/shared/components/ui/accordion",
    description: "Collapsible sections that expand and collapse on click",
    therapyUse: "Expandable hint sections, multi-step instructions, grouped activity settings",
    props: "type, collapsible, value, onValueChange",
  },
  {
    name: "Alert",
    importPath: "@/shared/components/ui/alert",
    description: "Status or informational banner",
    therapyUse: "Session reminders, achievement callouts, important instructions at top of screen",
    props: "variant (default, destructive)",
  },
  {
    name: "AlertDialog",
    importPath: "@/shared/components/ui/alert-dialog",
    description: "Modal confirmation requiring explicit user action",
    therapyUse: "Confirm before clearing a board, confirm session end",
    props: "open, onOpenChange; AlertDialogTrigger, AlertDialogContent subcomponents",
  },
  {
    name: "AspectRatio",
    importPath: "@/shared/components/ui/aspect-ratio",
    description: "Maintains a fixed width-to-height ratio for its child",
    therapyUse: "Consistent symbol and image display in AAC grids and vocabulary cards",
    props: "ratio (number — e.g. 1 for square, 4/3 for standard)",
  },
  {
    name: "Avatar",
    importPath: "@/shared/components/ui/avatar",
    description: "Circular image with fallback initials",
    therapyUse: "Child profile picture, therapist identification",
    props: "AvatarImage src, AvatarFallback text",
  },
  {
    name: "Badge",
    importPath: "@/shared/components/ui/badge",
    description: "Small status or count pill",
    therapyUse: "Token count, difficulty level indicator, word category label",
    props: "variant (default, secondary, destructive, outline)",
  },
  {
    name: "Breadcrumb",
    importPath: "@/shared/components/ui/breadcrumb",
    description: "Hierarchical step or path indicator",
    therapyUse: "Multi-step activity progress (Step 1 of 3), visual schedule position indicator",
  },
  {
    name: "Button",
    importPath: "@/shared/components/ui/button",
    description: "Primary interactive element",
    therapyUse: "AAC symbol buttons, Done/Next/Skip actions, reward triggers. Use h-16 min-w-[60px] for child-sized touch targets",
    props: "variant (default, outline, ghost, destructive), size (sm, default, lg, icon)",
  },
  {
    name: "Calendar",
    importPath: "@/shared/components/ui/calendar",
    description: "Date picker calendar",
    therapyUse: "Scheduling therapy sessions, selecting routine dates",
    props: "mode (single, multiple, range), selected, onSelect",
  },
  {
    name: "Card",
    importPath: "@/shared/components/ui/card",
    description: "Content container with optional header, content, and footer sections",
    therapyUse: "Vocabulary word display, activity card, reward card, score summary",
    props: "CardHeader, CardTitle, CardContent, CardFooter subcomponents",
  },
  {
    name: "Carousel",
    importPath: "@/shared/components/ui/carousel",
    description: "Horizontally scrollable item carousel",
    therapyUse: "Flashcard sets, vocabulary image review, step-by-step visual instructions",
    props: "orientation, opts; CarouselContent, CarouselItem, CarouselPrevious, CarouselNext subcomponents",
  },
  {
    name: "Checkbox",
    importPath: "@/shared/components/ui/checkbox",
    description: "Boolean toggle checkbox",
    therapyUse: "Completed tasks in visual schedule, multi-select word lists, checklist activities",
    props: "checked, onCheckedChange, id",
  },
  {
    name: "Collapsible",
    importPath: "@/shared/components/ui/collapsible",
    description: "Show and hide content with animated transition",
    therapyUse: "Hint section, optional instructions, expandable word details",
    props: "open, onOpenChange; CollapsibleTrigger, CollapsibleContent subcomponents",
  },
  {
    name: "Command",
    importPath: "@/shared/components/ui/command",
    description: "Searchable command palette with keyboard navigation",
    therapyUse: "Symbol or word search in large AAC vocabulary sets, quick navigation",
    props: "CommandInput, CommandList, CommandItem, CommandGroup subcomponents",
  },
  {
    name: "Dialog",
    importPath: "@/shared/components/ui/dialog",
    description: "Modal overlay dialog",
    therapyUse: "Instructions popup, celebration overlay, image enlargement, confirmation",
    props: "open, onOpenChange; DialogTrigger, DialogContent, DialogTitle subcomponents",
  },
  {
    name: "Drawer",
    importPath: "@/shared/components/ui/drawer",
    description: "Slide-up bottom panel, optimized for mobile touch",
    therapyUse: "Mobile settings panel, more options menu, symbol detail view on small screens",
    props: "open, onOpenChange; DrawerTrigger, DrawerContent, DrawerTitle subcomponents",
  },
  {
    name: "DropdownMenu",
    importPath: "@/shared/components/ui/dropdown-menu",
    description: "Contextual options menu triggered by a button",
    therapyUse: "Word category selector, voice selection, settings overflow menu",
    props: "DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem subcomponents",
  },
  {
    name: "Form",
    importPath: "@/shared/components/ui/form",
    description: "react-hook-form integration with accessible labels and error messages",
    therapyUse: "Goal entry forms, patient settings, complex editor sections with validation",
    props: "useForm hook required; FormField, FormItem, FormLabel, FormControl, FormMessage subcomponents",
  },
  {
    name: "HoverCard",
    importPath: "@/shared/components/ui/hover-card",
    description: "Preview card that appears on hover",
    therapyUse: "Symbol definition on desktop AAC, word pronunciation hint",
    props: "HoverCardTrigger, HoverCardContent; openDelay, closeDelay",
  },
  {
    name: "Input",
    importPath: "@/shared/components/ui/input",
    description: "Single-line text input",
    therapyUse: "Search field, label editing, add new word, name entry",
    props: "type, value, onChange, placeholder, disabled",
  },
  {
    name: "Label",
    importPath: "@/shared/components/ui/label",
    description: "Accessible form field label",
    therapyUse: "Paired with every form input. Always set htmlFor matching the input id",
    props: "htmlFor",
  },
  {
    name: "NavigationMenu",
    importPath: "@/shared/components/ui/navigation-menu",
    description: "Accessible top-level navigation menu",
    therapyUse: "Section navigation in multi-page tools, switching between core and fringe vocabulary",
    props: "NavigationMenuList, NavigationMenuItem, NavigationMenuLink subcomponents",
  },
  {
    name: "Popover",
    importPath: "@/shared/components/ui/popover",
    description: "Floating panel anchored to a trigger element",
    therapyUse: "Color picker, emoji selector, quick word add, inline settings",
    props: "open, onOpenChange; PopoverTrigger, PopoverContent subcomponents",
  },
  {
    name: "Progress",
    importPath: "@/shared/components/ui/progress",
    description: "Determinate horizontal progress bar",
    therapyUse: "Tokens earned, activity completion percentage, session progress",
    props: "value (0–100)",
  },
  {
    name: "RadioGroup",
    importPath: "@/shared/components/ui/radio-group",
    description: "Mutually exclusive option selection",
    therapyUse: "Difficulty selection, answer choices in activities, mode selector",
    props: "value, onValueChange; RadioGroupItem subcomponent paired with Label",
  },
  {
    name: "Resizable",
    importPath: "@/shared/components/ui/resizable",
    description: "User-resizable split-pane layout",
    therapyUse: "Side-by-side prompt/response layout, adjustable workspace",
    props: "ResizablePanelGroup direction, ResizablePanel, ResizableHandle subcomponents",
  },
  {
    name: "ScrollArea",
    importPath: "@/shared/components/ui/scroll-area",
    description: "Scrollable container with styled scrollbar",
    therapyUse: "Long word lists, activity logs, vocabulary sets too large for one screen",
    props: "className for height constraint; ScrollBar orientation",
  },
  {
    name: "Select",
    importPath: "@/shared/components/ui/select",
    description: "Dropdown selector",
    therapyUse: "Category filter, voice selection, difficulty level, template chooser",
    props: "value, onValueChange; SelectTrigger, SelectContent, SelectItem subcomponents",
  },
  {
    name: "Separator",
    importPath: "@/shared/components/ui/separator",
    description: "Visual horizontal or vertical divider line",
    therapyUse: "Dividing editor sections. Use sparingly — prefer tonal background shifts for sectioning in child-facing UIs",
    props: "orientation (horizontal, vertical), decorative",
  },
  {
    name: "Sheet",
    importPath: "@/shared/components/ui/sheet",
    description: "Side slide-in panel overlay",
    therapyUse: "Settings panel, word list editor, activity details on desktop",
    props: "side (top, bottom, left, right); SheetTrigger, SheetContent, SheetTitle subcomponents",
  },
  {
    name: "Skeleton",
    importPath: "@/shared/components/ui/skeleton",
    description: "Animated loading placeholder block",
    therapyUse: "Loading states for image and audio content, board initialization delay",
    props: "className for sizing (e.g. h-12 w-full rounded-xl)",
  },
  {
    name: "Slider",
    importPath: "@/shared/components/ui/slider",
    description: "Range input for numeric values",
    therapyUse: "Difficulty level adjustment, volume control, timer duration, number of tokens",
    props: "min, max, step, value (array), onValueChange, disabled",
  },
  {
    name: "Sonner",
    importPath: "@/shared/components/ui/sonner",
    description: "Toast notification system (requires Toaster in app layout)",
    therapyUse: "Save confirmation, token earned celebration, brief error feedback",
    props: "Call toast() from the sonner package to trigger notifications",
  },
  {
    name: "Switch",
    importPath: "@/shared/components/ui/switch",
    description: "Binary toggle switch",
    therapyUse: "Enable/disable sounds, high contrast mode, auto-speak toggle",
    props: "checked, onCheckedChange, id",
  },
  {
    name: "Table",
    importPath: "@/shared/components/ui/table",
    description: "Data table with header and body rows",
    therapyUse: "Goal tracking summary, word list with categories, session data overview",
    props: "Table, TableHeader, TableBody, TableRow, TableHead, TableCell subcomponents",
  },
  {
    name: "Tabs",
    importPath: "@/shared/components/ui/tabs",
    description: "Tabbed content panels with a shared trigger strip",
    therapyUse: "Core words vs. fringe vocabulary, today vs. weekly schedule, category tabs",
    props: "value, onValueChange; TabsList, TabsTrigger, TabsContent subcomponents",
  },
  {
    name: "Textarea",
    importPath: "@/shared/components/ui/textarea",
    description: "Multi-line text input",
    therapyUse: "Long descriptions, session notes, multi-sentence prompts",
    props: "value, onChange, rows, placeholder",
  },
  {
    name: "Toggle",
    importPath: "@/shared/components/ui/toggle",
    description: "Single toggle button with pressed/unpressed visual state",
    therapyUse: "Mute/unmute sounds, show/hide text labels, mark an item done",
    props: "pressed, onPressedChange, variant (default, outline)",
  },
  {
    name: "ToggleGroup",
    importPath: "@/shared/components/ui/toggle-group",
    description: "Group of toggle buttons with one or many active at once",
    therapyUse: "Word category filter buttons, difficulty selector, display mode switcher",
    props: "type (single, multiple), value, onValueChange; ToggleGroupItem subcomponent",
  },
  {
    name: "Tooltip",
    importPath: "@/shared/components/ui/tooltip",
    description: "Short hover tooltip for hints and supplementary labels",
    therapyUse: "Keyboard shortcut hints, component descriptions on desktop. Never use as the only source of critical information",
    props: "TooltipTrigger, TooltipContent; TooltipProvider must wrap the app",
  },
];

export const TEMPLATE_DESIGN_RULES: DesignRule[] = [
  // Accessibility
  {
    rule: "Touch targets minimum 60×60px",
    rationale: "Kids have less fine motor control than adults",
  },
  {
    rule: "Text minimum 18px, prefer 20–24px for primary content",
    rationale: "Child readability and low-vision accessibility",
  },
  {
    rule: "WCAG AAA contrast preferred, AA minimum",
    rationale: "Vision and cognitive accessibility for all users",
  },
  // Sensory
  {
    rule: "Animations off by default — enable only via explicit user action or shell settings",
    rationale: "Autistic users can be highly sensitive to unexpected motion",
  },
  {
    rule: "No autoplay sounds — every sound must be triggered by an explicit user action",
    rationale: "Sensory sensitivity — unexpected sounds can cause distress",
  },
  {
    rule: "Avoid busy or patterned backgrounds — use solid or subtly tinted surfaces",
    rationale: "Reduces visual noise and cognitive load for autistic users",
  },
  // Cognitive
  {
    rule: "One primary action visible at a time",
    rationale: "Reduces decision fatigue for young and autistic users",
  },
  {
    rule: "Every interaction must produce immediate visible feedback",
    rationale: "Predictability is calming — silence or delay after a tap causes anxiety",
  },
  {
    rule: "No dead ends — all errors must be easily undoable without navigating away",
    rationale: "Error tolerance reduces anxiety and encourages exploration",
  },
  {
    rule: "Symbol and text label always together — never symbol alone or text alone",
    rationale: "Core AAC convention for users with limited literacy",
  },
  // Color
  {
    rule: "Bright, saturated colors over muted or neutral palettes",
    rationale: "Engagement and visual clarity — children respond to vibrant colors",
  },
  {
    rule: "Fitzgerald key for AAC: yellow=people/pronouns, green=verbs/actions, blue=descriptors, orange=nouns/objects",
    rationale: "SLP standard AAC color convention — SLPs and children already know this system",
  },
  {
    rule: "No purple or blue gradients",
    rationale: "Generic AI default aesthetic — not therapy-appropriate",
  },
  // Layout
  {
    rule: "Large rounded shapes — prefer rounded-2xl and rounded-full over sharp corners",
    rationale: "Approachable, non-threatening UI for children",
  },
  {
    rule: "Simple flat navigation — children tap through an activity, they do not browse",
    rationale: "Minimize navigation complexity for young users",
  },
  {
    rule: "Positive reinforcement elements (stars, celebrations) must be dismissible",
    rationale: "Sensory sensitivity — some autistic children find unexpected celebrations distressing",
  },
];

export function registryToPrompt(): string {
  const componentLines = COMPONENT_REGISTRY.map((c) => {
    const propsNote = c.props ? ` Props: ${c.props}.` : "";
    return `- **${c.name}** (\`${c.importPath}\`) — ${c.description}.${propsNote} Therapy use: ${c.therapyUse}.`;
  }).join("\n");

  const ruleLines = TEMPLATE_DESIGN_RULES.map(
    (r) => `- ${r.rule} (${r.rationale})`
  ).join("\n");

  return `## Available UI Components\n${componentLines}\n\n## Child & Autism-Friendly Design Rules\n${ruleLines}`;
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npx vitest run src/features/tools/lib/__tests__/component-registry.test.ts
```

Expected: All 9 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/lib/component-registry.ts src/features/tools/lib/__tests__/component-registry.test.ts
git commit -m "feat: add component registry with child-friendly design rules"
```

---

### Task 4: Enhance premium-prompt.ts with TEMPLATE_DESIGN_RULES

**Files:**
- Modify: `src/features/tools/lib/ai/premium-prompt.ts`
- Modify: `src/features/tools/lib/ai/__tests__/premium-prompt.test.ts`

- [ ] **Step 1: Update the test file first**

Replace the full contents of `src/features/tools/lib/ai/__tests__/premium-prompt.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { TEMPLATE_DESIGN_RULES } from "../../component-registry";
import { buildPremiumToolPrompt } from "../premium-prompt";

describe("buildPremiumToolPrompt", () => {
  it("contains the Child & Autism-Friendly Design Rules section", () => {
    const prompt = buildPremiumToolPrompt({
      description: "Build an articulation game for a 5-year-old working on /s/ sounds.",
      childContext: "Age range: 5-7\nInterests: dinosaurs",
      templateName: "Speech Game",
      schemaNotes: "{ /* schema */ }",
    });

    expect(prompt).toContain("## Child & Autism-Friendly Design Rules");
  });

  it("includes the 60px touch target rule", () => {
    const prompt = buildPremiumToolPrompt({
      description: "Token board",
      childContext: "",
      templateName: "Token Board",
      schemaNotes: "Return default config",
    });

    expect(prompt).toContain("60");
  });

  it("includes the no-autoplay-sounds rule", () => {
    const prompt = buildPremiumToolPrompt({
      description: "AAC board",
      childContext: "",
      templateName: "AAC Communication Board",
      schemaNotes: "Return default config",
    });

    expect(prompt).toContain("autoplay sounds");
  });

  it("includes all rules from TEMPLATE_DESIGN_RULES", () => {
    const prompt = buildPremiumToolPrompt({
      description: "test",
      childContext: "",
      templateName: "Test Template",
      schemaNotes: "test",
    });

    for (const rule of TEMPLATE_DESIGN_RULES) {
      expect(prompt, `missing rule: ${rule.rule}`).toContain(rule.rule);
    }
  });

  it("includes the clinician request verbatim", () => {
    const description = "Create a matching game with dinosaur vocabulary for a 7-year-old";
    const prompt = buildPremiumToolPrompt({
      description,
      childContext: "",
      templateName: "Matching Game",
      schemaNotes: "schema",
    });
    expect(prompt).toContain(description);
  });

  it("includes child context when provided", () => {
    const prompt = buildPremiumToolPrompt({
      description: "test",
      childContext: "Age range: 3-5\nInterests: trains",
      templateName: "Visual Schedule",
      schemaNotes: "schema",
    });
    expect(prompt).toContain("trains");
  });
});
```

- [ ] **Step 2: Run updated tests to confirm failure on the new assertions**

```bash
npx vitest run src/features/tools/lib/ai/__tests__/premium-prompt.test.ts
```

Expected: "contains the Child & Autism-Friendly Design Rules section" fails (and the other new assertions fail too).

- [ ] **Step 3: Update premium-prompt.ts**

Replace the full contents of `src/features/tools/lib/ai/premium-prompt.ts`:

```typescript
import { TEMPLATE_DESIGN_RULES } from "../component-registry";
import { DEFAULT_GENERATION_PROFILE, type GenerationProfile } from "./generation-profile";

export function buildPremiumToolPrompt(args: {
  description: string;
  childContext: string;
  templateName: string;
  schemaNotes: string;
  generationProfile?: GenerationProfile;
}) {
  const profile = { ...DEFAULT_GENERATION_PROFILE, ...args.generationProfile };

  const rulesSection = TEMPLATE_DESIGN_RULES.map(
    (r) => `- ${r.rule} (${r.rationale})`
  ).join("\n");

  return `You are helping a speech-language pathologist configure a therapy app for a child.
The child may be autistic or have a communication disorder. Apply the design rules
below unconditionally — they are not suggestions.

## Child & Autism-Friendly Design Rules
${rulesSection}

Template:
${args.templateName}

Generation profile:
${JSON.stringify(profile, null, 2)}

Child context:
${args.childContext || "No child profile provided."}

Clinician request:
${args.description}

Return an object that strictly matches this schema guidance:
${args.schemaNotes}`;
}
```

- [ ] **Step 4: Run tests to verify they all pass**

```bash
npx vitest run src/features/tools/lib/ai/__tests__/premium-prompt.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npm test 2>&1 | tail -20
```

Expected: Same pass/fail ratio as before. The 2 pre-existing failures on main (ElevenLabs voice ID and settings bg-white) are unrelated — ignore them.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/lib/ai/premium-prompt.ts src/features/tools/lib/ai/__tests__/premium-prompt.test.ts
git commit -m "feat: inject child-friendly design rules into AI config generation prompt"
```

---

### Task 5: Enhance schemaPrompt per template in registry.ts

**Files:**
- Modify: `src/features/tools/lib/registry.ts`

All five templates currently share the same unhelpful `schemaPrompt: "Return a config object matching the template defaults."`. This gives the AI no template-specific guidance.

- [ ] **Step 1: Replace each schemaPrompt in registry.ts**

Find each `schemaPrompt:` field in `src/features/tools/lib/registry.ts` and replace as follows.

For `aac_board`, replace:
```typescript
schemaPrompt: "Return a config object matching the template defaults.",
```
with:
```typescript
schemaPrompt: `Generate buttons that match the clinician request and child context.
- Apply Fitzgerald key colors via wordCategory: "verb" (green), "pronoun" (yellow), "noun" (orange), "descriptor" (blue), "social" (pink)
- speakText should be a natural spoken phrase (e.g. "I want more please", not just "More")
- Prefer 6–12 buttons in a 3×2 or 3×3 grid appropriate to the child's communication level
- Use vocabulary appropriate for the child's age range and interests
- Set autoSpeak: true unless the request implies sentence building
- Set sentenceStripEnabled: true if the request mentions sentence building or combining words`,
```

For `first_then_board`, replace:
```typescript
schemaPrompt: "Return a config object matching the template defaults.",
```
with:
```typescript
schemaPrompt: `Set firstLabel and thenLabel to specific, concrete activities — never generic placeholders.
- firstLabel should name the task the child must complete (e.g. "Finish your worksheet")
- thenLabel should name the motivating reward (e.g. "5 minutes of dinosaur videos")
- If child interests are provided, weave them into the thenLabel
- firstColor and thenColor should be visually distinct bright hex values
- showCheckmark: true by default`,
```

For `token_board`, replace:
```typescript
schemaPrompt: "Return a config object matching the template defaults.",
```
with:
```typescript
schemaPrompt: `Set rewardLabel to a specific, motivating reward matching the child profile — never "Reward" or "Prize".
- tokenCount: 3–5 for young children (ages 3–5), 5–8 for older children
- tokenShape: "star" by default; "circle" for simpler visual needs
- tokenColor should be bright and positive — gold (#FBBF24), green (#22c55e), or aligned with child interests`,
```

For `visual_schedule`, replace:
```typescript
schemaPrompt: "Return a config object matching the template defaults.",
```
with:
```typescript
schemaPrompt: `Generate 3–8 schedule items with concrete, specific labels — never "Activity 1" or "Step 2".
- Each item label should name a real activity (e.g. "Put on shoes", "Eat breakfast")
- durationMinutes should reflect realistic times for the age range
- Items should follow a logical sequential order appropriate to the context
- showCheckmarks: true and showDuration: true by default`,
```

For `matching_game`, replace:
```typescript
schemaPrompt: "Return a config object matching the template defaults.",
```
with:
```typescript
schemaPrompt: `Generate 4–8 word-answer pairs that match the described vocabulary or concept goal.
- Each pair: prompt is the cue (word, category, or question), answer is the correct match
- Pairs should be meaningfully related and appropriately challenging for the age range
- Avoid trivially easy pairs (dog/cat) unless the request is explicitly for beginners
- celebrateCorrect: true for engagement`,
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/lib/registry.ts
git commit -m "feat: add specific AI schema prompts per template type"
```

---

### Task 6: Create scripts/new-template.ts scaffold generator

**Files:**
- Create: `scripts/new-template.ts`

- [ ] **Step 1: Create the scaffold script**

`scripts/new-template.ts`:
```typescript
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
```

- [ ] **Step 2: Test the scaffold — generate a demo template**

```bash
npx tsx scripts/new-template.ts demo-widget
```

Expected: Prints file creation confirmation and the registry.ts snippet.

- [ ] **Step 3: Verify generated files look correct**

```bash
cat src/features/tools/lib/templates/demo-widget/schema.ts
```

Expected: File has `DemoWidgetConfigSchema`, `DemoWidgetConfig` type, compiles without errors.

```bash
cat src/features/tools/lib/templates/demo-widget/runtime.tsx
```

Expected: File has `DemoWidgetRuntime`, design rules comment header, `PremiumScreen` import, and 60px touch-target button.

- [ ] **Step 4: Verify TypeScript accepts the generated files**

```bash
npx tsc --noEmit
```

Expected: 0 new errors from generated files.

- [ ] **Step 5: Delete the demo template**

```bash
rm -rf src/features/tools/lib/templates/demo-widget
```

- [ ] **Step 6: Commit**

```bash
git add scripts/new-template.ts
git commit -m "feat: add new-template scaffold script with child-friendly design stubs"
```

---

## Self-Review

**Spec coverage:**
- ✅ Deliverable 1 (13 missing components): Task 1
- ✅ Deliverable 2 (`component-registry.ts`, `COMPONENT_REGISTRY`, `TEMPLATE_DESIGN_RULES`, `registryToPrompt()`): Tasks 2 + 3
- ✅ Deliverable 3 (enhanced AI generation prompt): Task 4
- ✅ Deliverable 4 (template scaffold script): Task 6
- ✅ `schemaPrompt` enhancement: Task 5 (adjacent gap closed)
- ⚠️  `convex/tool-component-prompt.ts` + `sync-registry.ts` (from spec): **Not needed.** The AI generation runs in Next.js API routes (`src/app/api/tools/generate-config/route.ts`), not Convex. `premium-prompt.ts` can import `TEMPLATE_DESIGN_RULES` directly. The sync-registry concern in the spec was based on an incorrect assumption about where the AI runs.

**Placeholder scan:** All steps contain actual code. No TBD/TODO in plan body.

**Type consistency:**
- `ComponentEntry` and `DesignRule` defined once in Task 3, imported in Task 4 via `TEMPLATE_DESIGN_RULES`
- `buildPremiumToolPrompt` signature unchanged (same args, same return type `string`)
- `${pascal}Config` type consistent across schema.ts / editor.tsx / runtime.tsx stubs in Task 6
- `PremiumScreen` (not `RuntimeShell`) used in runtime stub — matches the pattern in all existing template runtimes
