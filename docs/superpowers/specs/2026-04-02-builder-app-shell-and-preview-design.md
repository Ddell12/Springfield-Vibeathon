# Builder App Shell And Preview Upgrades

**Date:** 2026-04-02
**Status:** Approved
**Program:** Speech Coach and Builder Upgrade Initiative

## Objective

Upgrade the builder so every generated or configured app starts from a stronger shared app shell instead of a bare template. Done means the builder uses a reusable advanced shell with save state, instructions, sounds, settings, progress tracking, difficulty, theme presets plus accent color override, and full-screen preview support.

## Background

The product has already shifted toward a config-driven template engine under `src/features/tools/`. That means the correct direction is not to revive the older code-generation builder, but to strengthen the shared shell and preview experience used by the existing template runtime.

The user request is effectively asking for two things:

- richer built-in app capabilities so a new therapy app feels complete from the start
- clearer builder controls for color and preview mode

## Product Decisions

- Use one shared advanced app shell used by all templates.
- Ship theme presets plus a single accent color override.
- Support both in-app full-screen preview and browser fullscreen, with the in-app mode as the primary experience.

## Desired Behavior

- When a therapist creates a new app from any template, then the app starts with a common shell that already supports saved state, instructions, sounds, settings, progress tracking, difficulty, and reset/completion behavior.
- When a template needs unique behavior, then it plugs into the shell through a well-defined contract instead of reimplementing common app features.
- When a therapist customizes appearance, then they can choose a theme preset and adjust the accent color without editing low-level design tokens.
- When a therapist wants to focus on the preview, then they can open an in-app full-screen preview mode and optionally use browser fullscreen too.

## Shared App Shell

The shared shell should own the generic mini-app concerns:

- persisted local state
- instructions/help surface
- optional sound controls
- settings surface
- progress model
- difficulty setting
- completion and reset patterns

Each template should provide only its domain-specific pieces, such as:

- template configuration schema
- template editor controls
- runtime renderer
- optional progress hooks
- optional sound hooks
- default settings

## Builder Controls

### Appearance

V1 appearance controls should include:

- theme preset selector
- accent color override

This should stop short of a full token editor. The goal is useful customization, not an open-ended design tool.

### Preview

Preview should support:

- normal embedded preview
- in-app full-screen preview mode
- optional browser fullscreen

The in-app mode should preserve Bridges styling and add a clear exit control. Browser fullscreen remains available as an extra option for device-like demos.

## Architecture Direction

This work should extend the current config-driven template engine and runtime shell in `src/features/tools/`. It should not revive the retired WAB or iframe-based generated-app pipeline.

Recommended implementation shape:

- expand the shared runtime shell contract
- add shell-level settings/progress/state primitives
- let each template declare what shell features it uses
- expose appearance and preview controls in the builder UI

## Boundaries

**Always:**
- Build on the existing config-driven template engine under `src/features/tools/`.
- Keep the shared shell consistent across templates.
- Preserve clinician-friendly language in builder UI copy.

**Ask first:**
- Reintroducing code generation as the main builder path
- Adding a full palette editor or arbitrary theme-token editing
- Adding template-specific one-off shell variants that break consistency

**Never:**
- Never make each template reimplement save state, settings, and progress independently
- Never turn the builder into a developer-style theme editor
- Never couple this work to the retired publish/runtime architecture

## Technical Pointers

- `src/features/tools/components/builder/tool-builder-wizard.tsx`
- `src/features/tools/components/builder/config-editor.tsx`
- `src/features/tools/components/builder/preview-panel.tsx`
- `src/features/tools/lib/runtime/runtime-shell.tsx`
- `src/features/tools/lib/registry.ts`
- `src/features/tools/lib/templates/*`
- `src/features/tools/hooks/use-tool-builder.ts`

## Risks And Mitigations

- **Risk:** The shell becomes too heavy for simple templates.  
  **Mitigation:** make shell capabilities modular and opt-in where appropriate, while keeping the user-facing experience consistent.

- **Risk:** Color customization creates ugly or inaccessible combinations.  
  **Mitigation:** constrain presets and accent overrides to validated accessible options.

- **Risk:** Full-screen preview duplicates logic.  
  **Mitigation:** treat fullscreen as a presentation mode of the same preview runtime, not a separate renderer.

## Verification

**Automated:**
- [ ] Shared shell tests cover persisted state, settings, and progress plumbing
- [ ] Template registry tests confirm templates can declare shell capabilities cleanly
- [ ] Builder UI tests cover theme preset, accent color, and fullscreen controls

**Manual:**
- [ ] Open multiple template types and confirm each starts from the shared advanced shell
- [ ] Change theme preset and accent color and confirm preview updates correctly
- [ ] Use in-app full-screen preview and return cleanly to the builder
- [ ] Trigger browser fullscreen from preview and confirm it still uses the same runtime content

## Out Of Scope

- A full visual theme editor
- Reviving the old AI code-generation builder as the main path
- Per-template bespoke app shell implementations
