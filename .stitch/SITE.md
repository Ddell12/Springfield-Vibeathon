# Bridges — Site Vision & Roadmap

> Stitch Project ID: `8590912414567125721`
> Design System: "The Digital Sanctuary" (see DESIGN.md)
> Stack: Next.js App Router + Convex + shadcn/ui + Tailwind v4

## 1. Vision

Bridges is an AI-powered vibe-coding platform where ABA therapists, speech therapists, and parents of autistic children describe therapy tools in plain language and get working, interactive tools built by AI. The design language — "The Digital Sanctuary" — balances clinical reliability with emotional warmth: tonal enclosure (no hard borders), dual-font typography (Manrope + Inter), and a teal-indigo palette grounded in Material 3 surfaces.

## 2. Target Screens

The complete set of screens needed for the Bridges MVP (Springfield Vibeathon, March 23-27, 2026):

| # | Screen | Purpose |
|---|--------|---------|
| 01 | Landing Page | Marketing hero, value props, CTA to builder |
| 02 | Builder — Empty State | Chat + preview panel, welcome message, suggested prompts |
| 03 | Builder — Active State | Active chat thread, live tool preview, config panel |
| 04 | Token Board Tool | Interactive reward chart with star tokens |
| 05 | Visual Schedule Tool | Drag-and-drop daily routine builder |
| 06 | My Tools Dashboard | Grid of saved/created tools |
| 07 | Templates Page | Pre-built therapy tool templates to start from |
| 08 | Shared Tool View | Public link view of a shared tool |
| 09 | Communication Board Tool | Picture cards with TTS, sentence strip |
| 10 | Emotion Chart Tool | Feelings identification with visual scales |
| 11 | Choice Board Tool | Decision-making board with options |

## 3. Navigation Structure

Left sidebar navigation (from Stitch-generated screens):
- **Builder** (main) — `/builder`
- **Templates** — `/templates`
- **My Tools** — `/tools`
- **Assets** — `/assets`
- **Library** — `/library`
- **Analytics** — `/analytics`
- **Settings** — `/settings`

## 4. Sitemap (Generated Screens)

- [x] 01 — Landing Page (`01-landing-page.html/.png`)
- [x] 02 — Builder Empty State (`02-builder-empty.html/.png`)
- [x] 03 — Builder Active State (`03-builder-active.html/.png`)
- [x] 04 — Token Board Tool (`04-token-board.html/.png`)
- [x] 05 — Visual Schedule Tool (`05-visual-schedule.html/.png`)
- [x] 06 — My Tools Dashboard (`06-my-tools.html/.png`)
- [x] 07 — Templates Page (`07-templates.html/.png`)
- [x] 08 — Shared Tool View (`08-shared-tool-view.html/.png`)
- [ ] 09 — Communication Board Tool
- [ ] 10 — Emotion Chart Tool
- [ ] 11 — Choice Board Tool

## 5. Roadmap (Next to Generate)

1. ~~**07 — Templates Page**~~ Done
2. **09 — Communication Board Tool** (core therapy tool — picture cards + TTS + sentence strip)
3. **10 — Emotion Chart Tool** (feelings thermometer, emoji faces, body map)
4. **11 — Choice Board Tool** (2-6 option decision board)

## 6. Creative Freedom (Future Ideas)

- Onboarding flow / first-time user experience
- Mobile-responsive versions of key screens
- Dark mode variants
- Print-friendly tool view for offline use
- Tool customization panel (colors, images, labels)
- Analytics dashboard showing tool usage stats
