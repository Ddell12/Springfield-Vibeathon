---
page: 09-communication-board
---
Design the Communication Board Tool for Bridges — an AI therapy tool builder. This is a core AAC (Augmentative and Alternative Communication) tool used by speech therapists and parents. It allows non-verbal or minimally verbal children to communicate by tapping picture cards that speak aloud via text-to-speech.

This screen shows the communication board IN USE — as a parent or child would see it after the AI builder generates it. It is NOT the builder view; it is the tool itself, rendered full-screen for easy touch interaction.

**DESIGN SYSTEM (REQUIRED):**

Creative North Star: "The Digital Sanctuary" — clinical reliability meets emotional warmth.

- Colors: Deep teal primary (#00595c / #0d7377), indigo secondary (#4e52ba / #8f93ff), warm peach accent (#ffdbca). Surface hierarchy: base (#f9f9ff) → container-low (#f0f3ff) → container-lowest (#ffffff) → container-high (#e2e8f8). Text: on-surface (#151c27), on-surface-variant (#3e4949).
- Typography: Manrope (600/700) for headlines, Inter (400/500) for body. Scale: display-lg 3.5rem, headline-md 1.75rem, body-md 1rem, label-sm 0.75rem.
- The "No-Line" Rule: NO 1px borders for sectioning. Use tonal background shifts between surface layers instead.
- The "Glass & Gradient" Rule: Primary CTAs use gradient from #00595c → #0d7377 at 135deg. Floating elements use glassmorphism (80% opacity, 20px backdrop-blur).
- Buttons: Primary = gradient fill, 8px radius. Secondary = #8f93ff fill. Ghost = no bg, primary text.
- Cards: surface-container-low backgrounds, no dividers, vertical whitespace separates items.
- Spacing: Micro (0.25-0.75rem) for internal, Meso (1-1.75rem) for grouping, Macro (2-4rem) for structure. "Supportive Gap" = min 2rem padding inside text containers.
- Shadows: Ambient only — 0px 12px 32px rgba(21,28,39,0.06). Never pure black shadows.
- Corner radius: 8px default, 4px minimum, 1.5rem for "Safe Space" containers.
- Animations: 300ms+ with cubic-bezier(0.4, 0, 0.2, 1).

**Page Structure:**

1. **Tool header bar** — Simple top bar with: tool title "Emma's Snack Request Board" (Manrope headline-sm), a speaker/volume icon, a settings gear icon, and a "Back to Builder" ghost button. Background: surface-container-low.

2. **Sentence strip** — A horizontal strip at the top showing the composed sentence. Shows tapped picture cards in sequence forming a sentence like "I want goldfish crackers please". Each word/card in the strip is a small rounded chip with the picture and label. A large teal "Speak" button with a speaker icon at the right end triggers TTS. Background: surface-container-lowest with xl radius (the "Safe Space" container).

3. **Category tabs** — Horizontal scrollable tabs below the sentence strip: "Snacks", "Drinks", "Actions", "Feelings", "People". Active tab uses primary color, inactive uses on-surface-variant.

4. **Picture card grid** — The main content area. A responsive grid (4 columns on desktop, 3 on tablet, 2 on mobile) of large, tappable picture cards. Each card:
   - Large, colorful illustration (AI-generated style — simple, flat, bold outlines, white background)
   - Label text below the image (Inter body-md, centered)
   - Surface-container-lowest background with ambient shadow
   - 12px radius
   - Touch target minimum 80x80px
   - Visual "selected" state: primary border glow + subtle scale-up
   - Cards shown: "Goldfish", "Pretzels", "Apple Slices", "Yogurt", "Crackers", "Banana", "Juice Box", "Water", "Cookies", "Grapes", "Cheese", "Popcorn"

5. **Quick phrases bar** — A bottom bar with pre-built common phrases as rounded pill buttons: "I want ___", "More please", "All done", "Help me", "Yes", "No". These are quick-tap shortcuts that add to the sentence strip.

6. **Floating action area** — Bottom-right floating buttons: "Clear" (ghost) to reset the sentence strip, and "Share" (secondary) to share this board via link.

**Key interaction states to show:**
- 2-3 cards in the "selected" state (showing they've been tapped and added to the sentence strip)
- The sentence strip populated with "I want goldfish crackers"
- The "Snacks" category tab active
