---
name: macos-gui
description: Automate macOS GUI interactions using the Steer binary — screenshots, clicks, typing, hotkeys, and window management.
---

# macOS GUI Automation

Use the `gui_*` MCP tools to observe and control macOS applications via the Accessibility API.

## When to Use

- User asks to "click on X", "type something into Y", "take a screenshot of Z"
- Automating repetitive UI workflows
- Extracting information from GUI applications
- Testing UI behavior

## Core Workflow

1. **Observe** — always start with `gui_screenshot` to see current state
2. **Identify** — use element IDs from the screenshot result for reliable targeting
3. **Act** — click, type, or use hotkeys
4. **Verify** — take another screenshot to confirm the action worked
5. **Wait** — use `gui_wait` (500-1000ms) after actions that trigger animations

## Available Tools

| Tool | Purpose |
|------|---------|
| `gui_screenshot` | Capture screen + UI element list |
| `gui_ocr` | Extract text via OCR |
| `gui_click` | Click by elementId, label, or coordinates |
| `gui_type` | Type text into focused field |
| `gui_hotkey` | Press keyboard shortcuts (e.g., `cmd+c`) |
| `gui_scroll` | Scroll up/down/left/right |
| `gui_drag` | Click-and-drag between coordinates |
| `gui_apps` | List running applications |
| `gui_window` | Get window info (position, size, title) |
| `gui_clipboard` | Read clipboard contents |
| `gui_wait` | Pause for animations (ms) |
| `gui_find` | Search for elements by label/role |
| `gui_focus` | Bring app to foreground |
| `gui_screens` | List displays and resolutions |

## Best Practices

- Prefer `elementId` over `label`, and `label` over `x`/`y` coordinates
- After clicking menus or buttons that open dialogs, call `gui_wait` then `gui_screenshot`
- Use `gui_find` when you know the element label but don't have a fresh screenshot
- Use `gui_focus` to bring the target app to the front before interacting

## Prerequisites

- macOS 13+
- Screen Recording permission granted to the Aura process
- Accessibility permission granted to the Aura process
- Steer binary built: run `tools/steer/build.sh` from the project root
- `macosGui.enabled: true` in `aura.config.json5`
