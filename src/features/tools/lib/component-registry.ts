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
    description: "Collapsible sections",
    therapyUse: "Expandable hint sections, multi-step instructions",
    props: "type, collapsible, value, onValueChange",
  },
  {
    name: "Alert",
    importPath: "@/shared/components/ui/alert",
    description: "Status banner",
    therapyUse: "Session reminders, achievement callouts",
    props: "variant (default, destructive)",
  },
  {
    name: "AlertDialog",
    importPath: "@/shared/components/ui/alert-dialog",
    description: "Modal confirmation",
    therapyUse: "Confirm before clearing board",
    props: "open, onOpenChange; subcomponents",
  },
  {
    name: "AspectRatio",
    importPath: "@/shared/components/ui/aspect-ratio",
    description: "Fixed ratio",
    therapyUse: "Consistent symbol display",
    props: "ratio",
  },
  {
    name: "Avatar",
    importPath: "@/shared/components/ui/avatar",
    description: "Circular image",
    therapyUse: "Child profile, therapist ID",
    props: "AvatarImage src, AvatarFallback text",
  },
  {
    name: "Badge",
    importPath: "@/shared/components/ui/badge",
    description: "Status pill",
    therapyUse: "Token count, difficulty level",
    props: "variant",
  },
  {
    name: "Breadcrumb",
    importPath: "@/shared/components/ui/breadcrumb",
    description: "Path indicator",
    therapyUse: "Multi-step progress",
    props: "subcomponents",
  },
  {
    name: "Button",
    importPath: "@/shared/components/ui/button",
    description: "Primary interactive",
    therapyUse: "AAC buttons, Done/Next",
    props: "variant, size",
  },
  {
    name: "Calendar",
    importPath: "@/shared/components/ui/calendar",
    description: "Date picker",
    therapyUse: "Scheduling therapy sessions",
    props: "mode, selected, onSelect",
  },
  {
    name: "Card",
    importPath: "@/shared/components/ui/card",
    description: "Content container",
    therapyUse: "Vocabulary display, activity card",
    props: "subcomponents",
  },
  {
    name: "Carousel",
    importPath: "@/shared/components/ui/carousel",
    description: "Horizontal scroll",
    therapyUse: "Flashcard sets",
    props: "orientation, opts; subcomponents",
  },
  {
    name: "Checkbox",
    importPath: "@/shared/components/ui/checkbox",
    description: "Boolean toggle",
    therapyUse: "Completed tasks",
    props: "checked, onCheckedChange, id",
  },
  {
    name: "Collapsible",
    importPath: "@/shared/components/ui/collapsible",
    description: "Show/hide",
    therapyUse: "Hint section",
    props: "open, onOpenChange; subcomponents",
  },
  {
    name: "Command",
    importPath: "@/shared/components/ui/command",
    description: "Search palette",
    therapyUse: "Symbol search in AAC",
    props: "subcomponents",
  },
  {
    name: "Dialog",
    importPath: "@/shared/components/ui/dialog",
    description: "Modal overlay",
    therapyUse: "Instructions popup",
    props: "open, onOpenChange; subcomponents",
  },
  {
    name: "Drawer",
    importPath: "@/shared/components/ui/drawer",
    description: "Bottom panel",
    therapyUse: "Mobile settings",
    props: "open, onOpenChange; subcomponents",
  },
  {
    name: "DropdownMenu",
    importPath: "@/shared/components/ui/dropdown-menu",
    description: "Options menu",
    therapyUse: "Word category selector",
    props: "subcomponents",
  },
  {
    name: "Form",
    importPath: "@/shared/components/ui/form",
    description: "react-hook-form integration",
    therapyUse: "Goal entry forms",
    props: "useForm required; subcomponents",
  },
  {
    name: "HoverCard",
    importPath: "@/shared/components/ui/hover-card",
    description: "Hover preview",
    therapyUse: "Symbol definition on desktop",
    props: "subcomponents; openDelay, closeDelay",
  },
  {
    name: "Input",
    importPath: "@/shared/components/ui/input",
    description: "Text input",
    therapyUse: "Search field, label editing",
    props: "type, value, onChange, placeholder, disabled",
  },
  {
    name: "Label",
    importPath: "@/shared/components/ui/label",
    description: "Form label",
    therapyUse: "Paired with every input",
    props: "htmlFor",
  },
  {
    name: "NavigationMenu",
    importPath: "@/shared/components/ui/navigation-menu",
    description: "Top-level nav",
    therapyUse: "Section navigation",
    props: "subcomponents",
  },
  {
    name: "Popover",
    importPath: "@/shared/components/ui/popover",
    description: "Floating panel",
    therapyUse: "Color picker, emoji selector",
    props: "open, onOpenChange; subcomponents",
  },
  {
    name: "Progress",
    importPath: "@/shared/components/ui/progress",
    description: "Progress bar",
    therapyUse: "Tokens earned",
    props: "value (0-100)",
  },
  {
    name: "RadioGroup",
    importPath: "@/shared/components/ui/radio-group",
    description: "Exclusive selection",
    therapyUse: "Difficulty selection",
    props: "value, onValueChange; RadioGroupItem",
  },
  {
    name: "Resizable",
    importPath: "@/shared/components/ui/resizable",
    description: "Split-pane",
    therapyUse: "Side-by-side layout",
    props: "subcomponents",
  },
  {
    name: "ScrollArea",
    importPath: "@/shared/components/ui/scroll-area",
    description: "Scrollable container",
    therapyUse: "Long word lists",
    props: "className; ScrollBar",
  },
  {
    name: "Select",
    importPath: "@/shared/components/ui/select",
    description: "Dropdown",
    therapyUse: "Category filter",
    props: "value, onValueChange; subcomponents",
  },
  {
    name: "Separator",
    importPath: "@/shared/components/ui/separator",
    description: "Divider",
    therapyUse: "Use sparingly",
    props: "orientation, decorative",
  },
  {
    name: "Sheet",
    importPath: "@/shared/components/ui/sheet",
    description: "Side panel",
    therapyUse: "Settings panel",
    props: "side; subcomponents",
  },
  {
    name: "Skeleton",
    importPath: "@/shared/components/ui/skeleton",
    description: "Loading placeholder",
    therapyUse: "Loading states",
    props: "className",
  },
  {
    name: "Slider",
    importPath: "@/shared/components/ui/slider",
    description: "Range input",
    therapyUse: "Difficulty, volume, timer",
    props: "min, max, step, value, onValueChange, disabled",
  },
  {
    name: "Sonner",
    importPath: "@/shared/components/ui/sonner",
    description: "Toast system",
    therapyUse: "Save confirmation",
    props: "Call toast()",
  },
  {
    name: "Switch",
    importPath: "@/shared/components/ui/switch",
    description: "Toggle switch",
    therapyUse: "Enable/disable sounds",
    props: "checked, onCheckedChange, id",
  },
  {
    name: "Table",
    importPath: "@/shared/components/ui/table",
    description: "Data table",
    therapyUse: "Goal tracking",
    props: "subcomponents",
  },
  {
    name: "Tabs",
    importPath: "@/shared/components/ui/tabs",
    description: "Tabbed panels",
    therapyUse: "Core vs fringe vocab",
    props: "value, onValueChange; subcomponents",
  },
  {
    name: "Textarea",
    importPath: "@/shared/components/ui/textarea",
    description: "Multi-line input",
    therapyUse: "Long descriptions",
    props: "value, onChange, rows, placeholder",
  },
  {
    name: "Toggle",
    importPath: "@/shared/components/ui/toggle",
    description: "Toggle button",
    therapyUse: "Mute/unmute",
    props: "pressed, onPressedChange, variant",
  },
  {
    name: "ToggleGroup",
    importPath: "@/shared/components/ui/toggle-group",
    description: "Group of toggles",
    therapyUse: "Word category filter",
    props: "type, value, onValueChange; ToggleGroupItem",
  },
  {
    name: "Tooltip",
    importPath: "@/shared/components/ui/tooltip",
    description: "Hover tooltip",
    therapyUse: "Keyboard shortcut hints",
    props: "subcomponents; TooltipProvider required",
  },
];

export const TEMPLATE_DESIGN_RULES: DesignRule[] = [
  {
    rule: "Touch targets minimum 60×60px",
    rationale: "Kids have less fine motor control",
  },
  {
    rule: "Text minimum 18px, prefer 20–24px",
    rationale: "Child readability and low-vision",
  },
  {
    rule: "WCAG AAA contrast preferred, AA minimum",
    rationale: "Vision and cognitive accessibility",
  },
  {
    rule: "Animations off by default",
    rationale: "Autistic users sensitive to motion",
  },
  {
    rule: "No autoplay sounds",
    rationale: "Sensory sensitivity",
  },
  {
    rule: "Avoid busy/patterned backgrounds",
    rationale: "Reduces visual noise",
  },
  {
    rule: "One primary action visible at a time",
    rationale: "Reduces decision fatigue",
  },
  {
    rule: "Every interaction must produce immediate visible feedback",
    rationale: "Predictability",
  },
  {
    rule: "No dead ends — errors easily undoable",
    rationale: "Error tolerance reduces anxiety",
  },
  {
    rule: "Symbol and text label always together",
    rationale: "Core AAC convention",
  },
  {
    rule: "Bright, saturated colors over muted",
    rationale: "Engagement and visual clarity",
  },
  {
    rule: "Fitzgerald key for AAC: yellow=people, green=verbs, blue=descriptors, orange=nouns",
    rationale: "SLP standard",
  },
  {
    rule: "No purple or blue gradients",
    rationale: "Generic AI default",
  },
  {
    rule: "Large rounded shapes — prefer rounded-2xl and rounded-full",
    rationale: "Approachable",
  },
  {
    rule: "Simple flat navigation",
    rationale: "Minimize complexity",
  },
  {
    rule: "Positive reinforcement elements must be dismissible",
    rationale: "Sensory sensitivity",
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
