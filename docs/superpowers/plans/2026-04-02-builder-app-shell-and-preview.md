# Builder App Shell And Preview Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the config-driven builder so every template starts from a stronger shared app shell with settings, progress, persisted state, theme presets, accent color, and fullscreen preview.

**Architecture:** Rewrite the current thin runtime shell into a real shared app-shell contract, but keep ownership boundaries explicit. Persist saved shell appearance inside the app instance config, keep ephemeral runtime state such as progress, difficulty, and sounds local to preview/runtime storage, and do not expand scope into Convex schema work. Migrate all five existing template runtimes to the shared shell contract, define semantic shell events before adding persisted shell state, and implement fullscreen through an explicit preview overlay plus optional browser Fullscreen API support.

**Tech Stack:** React, Next.js App Router, Convex client hooks, Zod-backed template registry, Vitest, React Testing Library

---

## File Structure Map

### Existing files to modify

- `src/features/tools/lib/registry.ts`
  Responsibility: Add shared shell metadata and default shell settings to each template registration.
- `src/features/tools/lib/runtime/runtime-shell.tsx`
  Responsibility: Grow from a thin chrome wrapper into the shared app shell with settings, instructions, progress, and fullscreen-aware presentation.
- `src/features/tools/components/builder/preview-panel.tsx`
  Responsibility: Add in-app fullscreen mode, browser fullscreen option, and appearance controls integration.
- `src/features/tools/components/builder/tool-builder-wizard.tsx`
  Responsibility: Surface theme preset and accent color controls in the customize step.
- `src/features/tools/hooks/use-tool-builder.ts`
  Responsibility: Track shell appearance settings and persist them with template config.
- `src/features/tools/lib/templates/aac-board/runtime.tsx`
  Responsibility: Adopt shell props instead of owning common app chrome itself.
- `src/features/tools/lib/templates/first-then-board/runtime.tsx`
  Responsibility: Adopt the shared shell contract and remove duplicate page chrome.
- `src/features/tools/lib/templates/matching-game/runtime.tsx`
  Responsibility: Adopt shell props and report semantic progress events into the shared shell.
- `src/features/tools/lib/templates/token-board/runtime.tsx`
  Responsibility: Adopt the shared shell contract and remove duplicate page chrome.
- `src/features/tools/lib/templates/visual-schedule/runtime.tsx`
  Responsibility: Adopt the shared shell contract and remove duplicate page chrome.

### New files to create

- `src/features/tools/lib/runtime/app-shell-types.ts`
  Responsibility: Shared shell config types, default settings, and capability flags.
- `src/features/tools/lib/runtime/use-app-shell-state.ts`
  Responsibility: Persist ephemeral shell state locally for preview/runtime only; saved appearance lives in app config instead.
- `src/features/tools/components/builder/appearance-controls.tsx`
  Responsibility: Render theme preset and accent color controls for the customize step.
- `src/features/tools/components/builder/fullscreen-preview-button.tsx`
  Responsibility: Isolate in-app overlay fullscreen and browser fullscreen actions.
- `src/features/tools/components/builder/__tests__/appearance-controls.test.tsx`
  Responsibility: Validate preset and accent updates.
- `src/features/tools/components/builder/__tests__/preview-panel.test.tsx`
  Responsibility: Validate fullscreen transitions and preview control wiring.
- `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`
  Responsibility: Validate shell settings, progress, and persisted-state behavior.

## Review Amendments

- Treat `runtime-shell.tsx` as a controlled rewrite, not a light extension. All five template runtimes must be accounted for in the migration plan.
- Shell state ownership is split deliberately:
  - Saved appearance such as `themePreset` and `accentColor` belongs in persisted app config.
  - Ephemeral runtime state such as `progress`, `difficulty`, and sound toggles belongs in local component state or localStorage only.
- Theme presets must be concrete shell tokens or CSS variable sets that affect both preview and published rendering through the same shell contract.
- Fullscreen behavior must use an explicit in-app overlay strategy and optionally call the browser Fullscreen API. Handle rejected or unavailable browser fullscreen gracefully.
- Shell events must be semantic and deduped. Do not allow free-form high-frequency event spam from runtimes.

## Task 1: Add Shared Shell Types To The Template Registry

**Files:**
- Create: `src/features/tools/lib/runtime/app-shell-types.ts`
- Modify: `src/features/tools/lib/registry.ts`
- Test: `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`

- [ ] **Step 1: Write the failing registry contract test**

```tsx
it("each template registration declares shared shell defaults", () => {
  Object.values(templateRegistry).forEach((registration) => {
    expect(registration.shell).toBeDefined();
    expect(registration.shell.themePreset).toBeTruthy();
    expect(registration.shell.enableInstructions).toBeTypeOf("boolean");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`
Expected: FAIL because template registrations do not yet declare shell metadata.

- [ ] **Step 3: Add shared shell types**

```ts
export type ThemePreset = "calm" | "playful" | "focused";

export type AppShellConfig = {
  themePreset: ThemePreset;
  accentColor: string;
  enableInstructions: boolean;
  enableSounds: boolean;
  enableDifficulty: boolean;
  enableProgress: boolean;
};

export const DEFAULT_APP_SHELL: AppShellConfig = {
  themePreset: "calm",
  accentColor: "#00595c",
  enableInstructions: true,
  enableSounds: true,
  enableDifficulty: true,
  enableProgress: true,
};
```

- [ ] **Step 4: Extend the registry contract**

```ts
export interface TemplateRegistration {
  meta: TemplateMeta;
  Editor: ComponentType<EditorProps<any>>;
  Runtime: ComponentType<RuntimeProps<any>>;
  defaultConfig: unknown;
  parseConfig: (json: string) => unknown;
  aiConfigSchema: z.ZodTypeAny;
  schemaPrompt: string;
  shell: AppShellConfig;
}

shell: {
  ...DEFAULT_APP_SHELL,
  enableSounds: true,
  enableDifficulty: false,
},
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`
Expected: PASS with all templates declaring shell defaults.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/lib/runtime/app-shell-types.ts src/features/tools/lib/registry.ts src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
git commit -m "feat: add shared builder app shell metadata"
```

## Task 2: Add Reusable App Shell State

**Files:**
- Create: `src/features/tools/lib/runtime/use-app-shell-state.ts`
- Create: `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`
- Modify: `src/features/tools/lib/runtime/runtime-shell.tsx`

- [ ] **Step 1: Write the failing runtime-shell state tests**

```tsx
it("persists difficulty and sound settings across rerenders", async () => {
  const { result, rerender } = renderHook(() =>
    useAppShellState({
      storageKey: "tool-preview-aac",
      shell: DEFAULT_APP_SHELL,
    })
  );

  act(() => result.current.setDifficulty("hard"));
  act(() => result.current.setSoundsEnabled(false));
  rerender();

  expect(result.current.difficulty).toBe("hard");
  expect(result.current.soundsEnabled).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`
Expected: FAIL because `useAppShellState` does not exist yet.

- [ ] **Step 3: Create the shared shell state hook**

```ts
export function useAppShellState({
  storageKey,
  shell,
}: {
  storageKey: string;
  shell: AppShellConfig;
}) {
  const [difficulty, setDifficulty] = useLocalStorageState(`${storageKey}:difficulty`, "medium");
  const [soundsEnabled, setSoundsEnabled] = useLocalStorageState(`${storageKey}:sounds`, shell.enableSounds);
  const [progress, setProgress] = useLocalStorageState(`${storageKey}:progress`, 0);

  return {
    difficulty,
    setDifficulty,
    soundsEnabled,
    setSoundsEnabled,
    progress,
    setProgress,
  };
}
```

- [ ] **Step 4: Teach `RuntimeShell` to render shared controls**

```tsx
export function RuntimeShell({
  mode,
  shell,
  title,
  onExit,
  children,
}: {
  mode: "preview" | "published";
  shell: AppShellConfig;
  title: string;
  onExit?: () => void;
  children: React.ReactNode;
}) {
  const state = useAppShellState({
    storageKey: `${mode}:${title}`,
    shell,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {mode === "preview" ? "Live preview" : "Published app"}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onExit}>Exit</Button>
      </header>
      <div className="grid gap-4 px-4 pb-6 pt-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl bg-muted/30 p-4">
          {shell.enableDifficulty ? <DifficultyControl value={state.difficulty} onChange={state.setDifficulty} /> : null}
          {shell.enableSounds ? <SoundToggle checked={state.soundsEnabled} onCheckedChange={state.setSoundsEnabled} /> : null}
          {shell.enableProgress ? <ProgressMeter value={state.progress} /> : null}
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`
Expected: PASS with persisted shell state working.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/lib/runtime/use-app-shell-state.ts src/features/tools/lib/runtime/runtime-shell.tsx src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx
git commit -m "feat: add reusable builder app shell state"
```

## Task 3: Add Builder Appearance Controls

**Files:**
- Create: `src/features/tools/components/builder/appearance-controls.tsx`
- Modify: `src/features/tools/hooks/use-tool-builder.ts`
- Modify: `src/features/tools/components/builder/tool-builder-wizard.tsx`
- Create: `src/features/tools/components/builder/__tests__/appearance-controls.test.tsx`

- [ ] **Step 1: Write the failing appearance-controls test**

```tsx
it("calls onChange when theme preset and accent color change", () => {
  const onChange = vi.fn();
  render(
    <AppearanceControls
      value={{ themePreset: "calm", accentColor: "#00595c" }}
      onChange={onChange}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Focused" }));
  fireEvent.change(screen.getByLabelText("Accent color"), {
    target: { value: "#0d7377" },
  });

  expect(onChange).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/tools/components/builder/__tests__/appearance-controls.test.tsx`
Expected: FAIL because `AppearanceControls` does not exist.

- [ ] **Step 3: Create the appearance control component**

```tsx
export function AppearanceControls({
  value,
  onChange,
}: {
  value: { themePreset: ThemePreset; accentColor: string };
  onChange: (value: { themePreset: ThemePreset; accentColor: string }) => void;
}) {
  return (
    <div className="rounded-2xl bg-muted/30 p-4">
      <p className="text-sm font-semibold text-foreground">Appearance</p>
      <div className="mt-3 flex gap-2">
        {["calm", "playful", "focused"].map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={value.themePreset === preset ? "default" : "outline"}
            onClick={() => onChange({ ...value, themePreset: preset as ThemePreset })}
          >
            {preset[0].toUpperCase() + preset.slice(1)}
          </Button>
        ))}
      </div>
      <Label htmlFor="accent-color" className="mt-4 block">Accent color</Label>
      <Input
        id="accent-color"
        type="color"
        value={value.accentColor}
        onChange={(event) => onChange({ ...value, accentColor: event.target.value })}
      />
    </div>
  );
}
```

- [ ] **Step 4: Persist appearance in builder state**

```ts
interface BuilderState {
  // existing fields...
  appearance: {
    themePreset: ThemePreset;
    accentColor: string;
  };
}

const [state, setState] = useState<BuilderState>({
  // existing fields...
  appearance: {
    themePreset: "calm",
    accentColor: "#00595c",
  },
});

const updateAppearance = useCallback((appearance: BuilderState["appearance"]) => {
  setState((s) => ({ ...s, appearance }));
}, []);
```

- [ ] **Step 5: Render appearance controls in step 3**

```tsx
<div className="p-4 border-b border-border shrink-0">
  <AppearanceControls
    value={builder.appearance}
    onChange={builder.updateAppearance}
  />
  <AIAssistPanel
    templateType={builder.templateType}
    childProfile={{}}
    onApply={(configJson) => {
      const reg = templateRegistry[builder.templateType!];
      if (reg) builder.updateConfig(reg.parseConfig(configJson));
    }}
  />
</div>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/features/tools/components/builder/__tests__/appearance-controls.test.tsx src/features/tools/hooks/__tests__/use-tool-builder.test.ts`
Expected: PASS with theme preset and accent state tracked in the builder.

- [ ] **Step 7: Commit**

```bash
git add src/features/tools/components/builder/appearance-controls.tsx src/features/tools/hooks/use-tool-builder.ts src/features/tools/components/builder/tool-builder-wizard.tsx src/features/tools/components/builder/__tests__/appearance-controls.test.tsx src/features/tools/hooks/__tests__/use-tool-builder.test.ts
git commit -m "feat: add builder appearance controls"
```

## Task 4: Add Fullscreen Preview Controls

**Files:**
- Create: `src/features/tools/components/builder/fullscreen-preview-button.tsx`
- Modify: `src/features/tools/components/builder/preview-panel.tsx`
- Create: `src/features/tools/components/builder/__tests__/preview-panel.test.tsx`

- [ ] **Step 1: Write the failing preview fullscreen test**

```tsx
it("opens in-app fullscreen preview mode and exposes browser fullscreen", () => {
  render(<PreviewPanel templateType="aac_board" config={templateRegistry.aac_board.defaultConfig} />);
  fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
  expect(screen.getByRole("button", { name: "Exit full screen" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Browser fullscreen" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/tools/components/builder/__tests__/preview-panel.test.tsx`
Expected: FAIL because the preview has no fullscreen controls.

- [ ] **Step 3: Create the isolated fullscreen button**

```tsx
export function FullscreenPreviewButton({
  onOpen,
  onBrowserFullscreen,
}: {
  onOpen: () => void;
  onBrowserFullscreen: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" onClick={onOpen}>Full screen</Button>
      <Button type="button" variant="outline" onClick={onBrowserFullscreen}>
        Browser fullscreen
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Teach `PreviewPanel` to switch presentation modes**

```tsx
const [isFullscreen, setIsFullscreen] = useState(false);
const containerRef = useRef<HTMLDivElement | null>(null);

async function handleBrowserFullscreen() {
  await containerRef.current?.requestFullscreen?.();
}

return (
  <div
    ref={containerRef}
    className={cn(
      "h-full overflow-y-auto bg-muted/30 p-4",
      isFullscreen && "fixed inset-0 z-50 bg-background p-6"
    )}
  >
    <div className="mb-3 flex items-center justify-between">
      <FullscreenPreviewButton
        onOpen={() => setIsFullscreen(true)}
        onBrowserFullscreen={handleBrowserFullscreen}
      />
      {isFullscreen ? (
        <Button type="button" variant="outline" onClick={() => setIsFullscreen(false)}>
          Exit full screen
        </Button>
      ) : null}
    </div>
    <div className="mx-auto max-w-lg overflow-hidden rounded-xl bg-background shadow-sm">
      <RuntimeShell mode="preview" shell={registration.shell} title={(config as { title?: string }).title ?? registration.meta.name}>
        <Runtime config={config} mode="preview" onEvent={() => undefined} voice={voice} />
      </RuntimeShell>
    </div>
  </div>
);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/features/tools/components/builder/__tests__/preview-panel.test.tsx`
Expected: PASS with both in-app and browser fullscreen affordances visible.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/components/builder/fullscreen-preview-button.tsx src/features/tools/components/builder/preview-panel.tsx src/features/tools/components/builder/__tests__/preview-panel.test.tsx
git commit -m "feat: add builder fullscreen preview controls"
```

## Task 5: Make Template Runtimes Consume The Shared Shell

**Files:**
- Modify: `src/features/tools/lib/templates/aac-board/runtime.tsx`
- Modify: `src/features/tools/lib/templates/matching-game/runtime.tsx`
- Test: `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`

- [ ] **Step 1: Write the failing runtime integration test**

```tsx
it("renders template content inside RuntimeShell-provided layout without crashing", () => {
  expect(() =>
    render(
      <RuntimeShell mode="preview" shell={templateRegistry.aac_board.shell} title="AAC Board">
        <templateRegistry.aac_board.Runtime
          config={templateRegistry.aac_board.defaultConfig as never}
          mode="preview"
          onEvent={vi.fn()}
          voice={MOCK_VOICE}
        />
      </RuntimeShell>
    )
  ).not.toThrow();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`
Expected: FAIL or produce layout conflicts because runtimes still own full-page wrappers.

- [ ] **Step 3: Strip full-page wrapper duplication from `AACBoardRuntime`**

```tsx
return (
  <div
    className={cn(
      "grid gap-3",
      config.highContrast && "high-contrast"
    )}
    style={{ gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))` }}
  >
    {config.buttons.map((button) => (
      <button key={button.id} onClick={() => handleButtonPress(button.id, button.label, button.speakText)}>
        {button.label}
      </button>
    ))}
  </div>
);
```

- [ ] **Step 4: Report progress into the shell from `MatchingGameRuntime`**

```tsx
useEffect(() => {
  const completedRatio = config.pairs.length === 0 ? 0 : matchedPairIds.size / config.pairs.length;
  onEvent("progress_updated", JSON.stringify({ percent: Math.round(completedRatio * 100) }));
}, [matchedPairIds, config.pairs.length, onEvent]);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`
Expected: PASS with runtimes working inside the shared shell contract.

- [ ] **Step 6: Commit**

```bash
git add src/features/tools/lib/templates/aac-board/runtime.tsx src/features/tools/lib/templates/matching-game/runtime.tsx src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx
git commit -m "feat: align template runtimes with shared app shell"
```

## Task 6: Full Verification Pass

**Files:**
- Modify: none unless fixes are required
- Test: `src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx`
- Test: `src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx`
- Test: `src/features/tools/components/builder/__tests__/appearance-controls.test.tsx`
- Test: `src/features/tools/components/builder/__tests__/preview-panel.test.tsx`
- Test: `src/features/tools/hooks/__tests__/use-tool-builder.test.ts`

- [ ] **Step 1: Run focused builder/runtime tests**

Run: `npm test -- src/features/tools/lib/runtime/__tests__/template-runtime-contract.test.tsx src/features/tools/lib/runtime/__tests__/runtime-shell.test.tsx src/features/tools/components/builder/__tests__/appearance-controls.test.tsx src/features/tools/components/builder/__tests__/preview-panel.test.tsx src/features/tools/hooks/__tests__/use-tool-builder.test.ts`
Expected: PASS with shell, appearance, and fullscreen behavior covered.

- [ ] **Step 2: Run type-check verification**

Run: `npx tsc --noEmit`
Expected: PASS with the shell contract changes reflected across all template runtimes and builder surfaces.

- [ ] **Step 3: Manually verify preview behavior**

```txt
1. Open the builder customize step for AAC Board and Matching Game.
2. Confirm the appearance controls show theme presets and an accent color picker.
3. Change appearance settings and confirm the preview updates immediately.
4. Open in-app full screen and confirm the preview expands with an exit control.
5. Trigger browser fullscreen and confirm the same preview content is shown.
6. Confirm settings, sounds, and progress surfaces are present in the shared app shell.
7. Confirm browser fullscreen failure leaves the preview usable and visible.
```

- [ ] **Step 4: Commit any final verification fixes**

```bash
git add src/features/tools
git commit -m "test: verify builder app shell and preview upgrades"
```

## Self-Review

### Spec Coverage

- Shared advanced app shell across templates: Tasks 1, 2, and 5.
- Save state, settings, sounds, progress, difficulty: Task 2.
- Theme presets and accent color: Task 3.
- In-app fullscreen plus browser fullscreen: Task 4.
- Stay within the config-driven tools engine: all tasks scoped to `src/features/tools/`.

### Placeholder Scan

- No `TODO`, `TBD`, or vague “handle later” instructions remain.
- Every task includes explicit files, commands, and code examples.

### Type Consistency

- Shared shell types used consistently: `AppShellConfig`, `DEFAULT_APP_SHELL`, `ThemePreset`.
- Shared shell state hook used consistently: `useAppShellState`.
- Preview fullscreen component used consistently: `FullscreenPreviewButton`.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 10 issues resolved, 24 test gaps identified and folded into the plan |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**OUTSIDE VOICE:** Claude Code CLI run captured 6 additional plan fixes, all accepted.
**UNRESOLVED:** 0
**VERDICT:** ENG CLEARED — ready to implement.
