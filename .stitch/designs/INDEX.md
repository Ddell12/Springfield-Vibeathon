# Bridges — Stitch Screen Index

> Generated 2026-03-23 from Stitch project `8590912414567125721`
> Design System: "The Digital Sanctuary" (Bridges Therapeutic)

## Screens Generated (8 of 11)

| # | Screen | File | Stitch Screen ID | Status |
|---|--------|------|------------------|--------|
| 01 | Landing Page | `01-landing-page.html/.png` | `1871824ab39242eba308035310eb4ee5` | Done |
| 02 | Builder — Empty State | `02-builder-empty.html/.png` | `88a6699a388f43929e4f257aa6453499` | Done |
| 03 | Builder — Active State | `03-builder-active.html/.png` | `f89e8ca2e3d34602b6687f7a50e98641` | Done |
| 04 | Token Board Tool | `04-token-board.html/.png` | `f8d50175040d44f0926fcbd6f8c4bd2a` | Done |
| 05 | Visual Schedule Tool | `05-visual-schedule.html/.png` | `bc3f36e6ea3746bea101fc3ca930148c` | Done |
| 06 | My Tools Page | `06-my-tools.html/.png` | `2dd2dcc105d3432f8afb1e350a483fd1` | Done |
| 07 | Templates Page | `07-templates.html/.png` | `e1418afed6d24e13a225534defd6c2cc` | Done |
| 08 | Shared Tool View | `08-shared-tool-view.html/.png` | `ba9b7673f8c34ff0ae1124a610660dcf` | Done |

## Key Design Decisions from Stitch

1. **Dual-font strategy**: Manrope (headlines) + Inter (body) — Stitch chose Manrope for its rounded terminals that feel child-friendly without being juvenile
2. **"No-Line" Rule**: Section boundaries via tonal background shifts, not 1px borders
3. **Surface Hierarchy**: 5-layer tonal system (surface → surface-container-low → ... → surface-container-highest)
4. **Glass & Gradient CTAs**: Primary buttons use 135deg gradient from `#00595c` → `#0d7377`
5. **"Safe Space" Container**: Signature component for AI chat — `surface-container-lowest` bg, `xl` radius, ghost border
6. **Warm accent**: `tertiary-fixed` (#ffdbca) peach tone for reward cards, therapist notes

## Navigation Pattern (from generated screens)

Stitch added a left sidebar navigation with:
- Builder (main)
- Templates
- My Tools
- Assets
- Library
- Analytics
- Settings

This matches the app structure in `docs/design/ux-screens.md`.

## How to Use These Designs

1. **As visual reference**: Open `.html` files in browser for pixel-perfect mockups
2. **As code reference**: HTML files contain complete component markup with inline styles
3. **For iteration**: Use `edit_screens` with screen IDs above to refine via Stitch
4. **During implementation**: Match component structure and spacing from the HTML source
