import type { FileSystemTree } from "@webcontainer/api";

export const templateFiles: FileSystemTree = {
  "package.json": {
    file: {
      contents: JSON.stringify(
        {
          name: "vite-therapy",
          private: true,
          type: "module",
          scripts: {
            dev: "vite --host 0.0.0.0",
            build: "vite build",
            preview: "vite preview",
          },
          dependencies: {
            "@radix-ui/react-progress": "^1.1.8",
            "@radix-ui/react-slot": "^1.2.4",
            "class-variance-authority": "^0.7.1",
            clsx: "^2.1.1",
            "lucide-react": "^1.6.0",
            motion: "^12.0.0",
            react: "^19.0.0",
            "react-dom": "^19.0.0",
            "tailwind-merge": "^3.5.0",
          },
          devDependencies: {
            "@tailwindcss/vite": "^4.0.0",
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            "@vitejs/plugin-react": "^4.4.0",
            tailwindcss: "^4.0.0",
            typescript: "^5.7.0",
            vite: "^6.0.0",
          },
        },
        null,
        2
      ),
    },
  },

  "index.html": {
    file: {
      contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <title>Bridges Tool</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    },
  },

  "vite.config.ts": {
    file: {
      contents: `import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
});
`,
    },
  },

  "tsconfig.json": {
    file: {
      contents: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            isolatedModules: true,
            moduleDetection: "force",
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
          },
          include: ["src"],
        },
        null,
        2
      ),
    },
  },

  src: {
    directory: {
      "main.tsx": {
        file: {
          contents: `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./therapy-ui.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
        },
      },

      "App.tsx": {
        file: {
          contents: `export default function App() {
  return (
    <div className="tool-container">
      <h1 className="tool-title">Loading your tool...</h1>
      <p className="tool-instruction">This will be replaced by your generated tool.</p>
    </div>
  );
}
`,
        },
      },

      "therapy-ui.css": {
        file: {
          contents: `@import "tailwindcss";

@theme {
  --color-primary: #00595c;
  --color-primary-light: #0d7377;
  --color-primary-bg: #e6f7f7;
  --color-secondary: #4e52ba;
  --color-accent: #ff8a65;
  --color-success: #4caf50;
  --color-surface: #fafafa;
  --color-surface-raised: #ffffff;
  --color-text: #1a1a2e;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-celebration: #ffd700;

  --font-heading: "Nunito", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}

/* === Base === */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
}

/* === Layout === */
.tool-container {
  max-width: 32rem;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100dvh;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-surface);
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

/* === Typography === */
.tool-title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.75rem;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 0.5rem;
}

.tool-instruction {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-text-muted);
  text-align: center;
  margin-bottom: 1.5rem;
}

.tool-label {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.875rem;
}

/* === Interactive Cards === */
.card-interactive {
  background: var(--color-surface-raised);
  border-radius: var(--radius-lg);
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.card-interactive:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.card-interactive:active {
  transform: scale(0.95);
}

/* === Tap Targets === */
.tap-target {
  min-height: 64px;
  min-width: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}

/* === Token Board Stars === */
.token-star {
  width: 48px;
  height: 48px;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-border);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.token-star.earned {
  background: var(--color-celebration);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.5);
  animation: bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* === Schedule Steps === */
.schedule-step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-raised);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-primary-light);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.schedule-step.completed {
  border-left-color: var(--color-success);
  opacity: 0.7;
}
.schedule-step.completed .step-text {
  text-decoration: line-through;
}

/* === Board Cells (Communication / Choice) === */
.board-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-surface-raised);
  border-radius: var(--radius-lg);
  border: 3px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.board-cell:active {
  transform: scale(0.93);
}
.board-cell.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 89, 92, 0.15);
  animation: pulse-glow 600ms ease-out;
}

/* === Buttons === */
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: white;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-xl);
  border: none;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  min-height: 48px;
}
.btn-primary:hover {
  opacity: 0.9;
  box-shadow: 0 4px 12px rgba(0, 89, 92, 0.3);
}
.btn-primary:active {
  transform: scale(0.95);
}

.btn-secondary {
  background: var(--color-surface-raised);
  color: var(--color-text);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
}
.btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* === Celebration Animations === */
.celebration-burst {
  position: relative;
}
.celebration-burst::after {
  content: "🎉";
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 3rem;
  animation: celebration 1.5s ease-out forwards;
  pointer-events: none;
}

@keyframes celebration {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  50% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(0, 89, 92, 0.4); }
  100% { box-shadow: 0 0 0 12px rgba(0, 89, 92, 0); }
}

@keyframes check-draw {
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}

/* === Responsive === */
@media (max-width: 480px) {
  .tool-container {
    padding: 1rem;
  }
  .tool-title {
    font-size: 1.5rem;
  }
  .tool-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
}

/* === Reduced Motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`,
        },
      },

      lib: {
        directory: {
          "utils.ts": {
            file: {
              contents: `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
            },
          },
        },
      },

      components: {
        directory: {
          "index.ts": {
            file: {
              contents: `export { TherapyCard } from "./TherapyCard";
export { TokenBoard } from "./TokenBoard";
export { VisualSchedule } from "./VisualSchedule";
export { CommunicationBoard } from "./CommunicationBoard";
export { DataTracker } from "./DataTracker";
export { CelebrationOverlay } from "./CelebrationOverlay";
export { ChoiceGrid } from "./ChoiceGrid";
export { TimerBar } from "./TimerBar";
export { PromptCard } from "./PromptCard";
`,
            },
          },

          "TherapyCard.tsx": {
            file: {
              contents: `import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/utils";

const cardVariants = cva(
  "rounded-[var(--radius-lg)] p-5 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
  {
    variants: {
      variant: {
        elevated:
          "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        flat: "bg-[var(--color-surface)]",
        interactive:
          "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:scale-[0.98] select-none",
      },
    },
    defaultVariants: { variant: "elevated" },
  }
);

interface TherapyCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
  children: ReactNode;
}

export function TherapyCard({
  variant,
  asChild,
  className,
  children,
  ...props
}: TherapyCardProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp className={cn(cardVariants({ variant }), className)} {...props}>
      {children}
    </Comp>
  );
}
`,
            },
          },

          "TokenBoard.tsx": {
            file: {
              contents: `import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

interface TokenBoardProps {
  goal: number;
  earned: number;
  onEarn: () => void;
  icon?: string;
}

export function TokenBoard({
  goal,
  earned,
  onEarn,
  icon,
}: TokenBoardProps) {
  const [justEarned, setJustEarned] = useState(-1);
  const prevEarned = useRef(earned);

  useEffect(() => {
    if (earned > prevEarned.current) {
      setJustEarned(earned - 1);
      const t = setTimeout(() => setJustEarned(-1), 600);
      prevEarned.current = earned;
      return () => clearTimeout(t);
    }
    prevEarned.current = earned;
  }, [earned]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: goal }, (_, i) => {
          const isEarned = i < earned;
          const isNext = i === earned;
          const isAnimating = i === justEarned;

          return (
            <button
              key={i}
              onClick={isNext ? onEarn : undefined}
              disabled={!isNext}
              aria-label={
                isEarned
                  ? \`Star \${i + 1} earned\`
                  : isNext
                    ? \`Tap to earn star \${i + 1}\`
                    : \`Star \${i + 1} locked\`
              }
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isEarned
                  ? "bg-[var(--color-celebration)] shadow-[0_0_16px_rgba(255,215,0,0.5)] scale-100"
                  : "bg-[var(--color-border)]",
                isNext && !isEarned && "ring-2 ring-[var(--color-primary)] ring-offset-2 cursor-pointer hover:scale-110 active:scale-95",
                !isNext && !isEarned && "opacity-50",
                isAnimating && "animate-[bounce-in_400ms_cubic-bezier(0.34,1.56,0.64,1)]"
              )}
            >
              {icon ? (
                <span className="text-2xl">{isEarned ? icon : "☆"}</span>
              ) : isEarned ? (
                <Star className="h-7 w-7 fill-amber-800 text-amber-800" />
              ) : (
                <Star className="h-7 w-7 text-gray-400" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-sm font-medium text-[var(--color-text-muted)]">
        {earned} / {goal} stars
      </p>

      {earned >= goal && (
        <div className="text-5xl animate-bounce" role="img" aria-label="Celebration!">
          🎉
        </div>
      )}
    </div>
  );
}
`,
            },
          },

          "VisualSchedule.tsx": {
            file: {
              contents: `import { Check, Circle } from "lucide-react";
import * as Progress from "@radix-ui/react-progress";

import { cn } from "../lib/utils";

interface ScheduleStep {
  label: string;
  icon?: string;
  done: boolean;
}

interface VisualScheduleProps {
  steps: ScheduleStep[];
  onToggle: (index: number) => void;
}

export function VisualSchedule({ steps, onToggle }: VisualScheduleProps) {
  const currentIndex = steps.findIndex((s) => !s.done);
  const completedCount = steps.filter((s) => s.done).length;
  const pct = (completedCount / steps.length) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">Progress</span>
        <span className="text-sm font-semibold text-[var(--color-primary)]">
          {completedCount} of {steps.length}
        </span>
      </div>

      <Progress.Root
        className="h-2.5 overflow-hidden rounded-full bg-[var(--color-border)]"
        value={pct}
      >
        <Progress.Indicator
          className="h-full rounded-full bg-[var(--color-success)] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: \`translateX(-\${100 - pct}%)\` }}
        />
      </Progress.Root>

      <div className="flex flex-col gap-2 mt-2">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => onToggle(i)}
            className={cn(
              "schedule-step gap-3 text-left",
              step.done && "completed",
              i === currentIndex && "ring-2 ring-[var(--color-primary)] ring-offset-1"
            )}
            aria-label={\`\${step.done ? "Completed" : "Mark complete"}: \${step.label}\`}
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200">
              {step.done ? (
                <Check className="h-5 w-5 text-[var(--color-success)]" />
              ) : step.icon ? (
                <span className="text-xl">{step.icon}</span>
              ) : (
                <Circle className="h-5 w-5 text-[var(--color-text-muted)]" />
              )}
            </span>

            <span
              className={cn(
                "step-text flex-1 font-medium",
                i === currentIndex && !step.done && "text-[var(--color-primary)] font-bold"
              )}
            >
              {step.label}
            </span>

            {i === currentIndex && !step.done && (
              <span className="text-xs rounded-full bg-[var(--color-primary-bg)] px-2 py-0.5 font-semibold text-[var(--color-primary)]">
                NOW
              </span>
            )}
          </button>
        ))}
      </div>

      {completedCount === steps.length && (
        <p className="mt-2 text-center text-lg font-bold text-[var(--color-success)]">
          🎉 All done!
        </p>
      )}
    </div>
  );
}
`,
            },
          },

          "CommunicationBoard.tsx": {
            file: {
              contents: `import { Volume2 } from "lucide-react";

import { cn } from "../lib/utils";

interface BoardItem {
  label: string;
  image?: string;
  sound?: string;
}

interface CommunicationBoardProps {
  items: BoardItem[];
  onSelect: (item: BoardItem) => void;
  columns?: number;
}

export function CommunicationBoard({
  items,
  onSelect,
  columns = 3,
}: CommunicationBoardProps) {
  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\`,
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onSelect(item)}
          className={cn(
            "board-cell min-h-[100px] flex flex-col items-center justify-center gap-2",
            "hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          )}
          aria-label={item.label}
        >
          {item.image ? (
            <span className="text-4xl" role="img" aria-hidden>
              {item.image}
            </span>
          ) : (
            <Volume2 className="h-8 w-8 text-[var(--color-primary)]" />
          )}
          <span className="text-sm font-semibold text-center leading-tight">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
`,
            },
          },

          "DataTracker.tsx": {
            file: {
              contents: `import { Minus, Plus, RotateCcw, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

interface DataTrackerProps {
  type: "trial" | "frequency" | "duration";
  onRecord: (data: { count: number; percentage?: number; duration?: number }) => void;
  targetCount?: number;
}

export function DataTracker({ type, onRecord, targetCount }: DataTrackerProps) {
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [count, setCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const formatTime = (s: number) =>
    \`\${Math.floor(s / 60).toString().padStart(2, "0")}:\${(s % 60).toString().padStart(2, "0")}\`;

  const total = correct + incorrect;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const save = useCallback(() => {
    if (type === "trial") onRecord({ count: total, percentage: pct });
    else if (type === "frequency") onRecord({ count });
    else onRecord({ count: 1, duration: seconds });
  }, [type, total, pct, count, seconds, onRecord]);

  const reset = () => {
    setCorrect(0);
    setIncorrect(0);
    setCount(0);
    setSeconds(0);
    setRunning(false);
  };

  if (type === "trial") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-5xl font-bold text-[var(--color-primary)] font-[var(--font-heading)]">
          {pct}%
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {correct} correct / {total} trials
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setCorrect((c) => c + 1)}
            className="btn-primary flex items-center gap-2 bg-[var(--color-success)]! min-w-[120px] justify-center"
          >
            <Plus className="h-5 w-5" /> Correct
          </button>
          <button
            onClick={() => setIncorrect((c) => c + 1)}
            className="btn-secondary flex items-center gap-2 min-w-[120px] justify-center text-red-600 border-red-300"
          >
            <Minus className="h-5 w-5" /> Incorrect
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="btn-primary text-sm px-4 py-2">Save Session</button>
          <button onClick={reset} className="btn-secondary text-sm px-4 py-2">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (type === "frequency") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl font-bold text-[var(--color-primary)] font-[var(--font-heading)]">
          {count}
        </div>
        {targetCount && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Target: {targetCount}
          </p>
        )}
        <button
          onClick={() => setCount((c) => c + 1)}
          className={cn(
            "tap-target h-24 w-24 rounded-full text-3xl font-bold text-white transition-all duration-200",
            "bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] active:scale-90",
            "shadow-[0_4px_12px_rgba(0,89,92,0.3)]"
          )}
        >
          +1
        </button>
        <div className="flex gap-2">
          <button onClick={save} className="btn-primary text-sm px-4 py-2">Save</button>
          <button onClick={reset} className="btn-secondary text-sm px-4 py-2">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Duration
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-5xl font-bold font-[var(--font-heading)] tabular-nums">
        <Timer className={cn("h-8 w-8", running ? "text-[var(--color-accent)] animate-pulse" : "text-[var(--color-text-muted)]")} />
        {formatTime(seconds)}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setRunning(!running)}
          className={cn("btn-primary min-w-[120px]", running && "bg-[var(--color-accent)]!")}
        >
          {running ? "Stop" : "Start"}
        </button>
        <button onClick={reset} className="btn-secondary">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      {seconds > 0 && !running && (
        <button onClick={save} className="btn-primary text-sm px-4 py-2">
          Save ({formatTime(seconds)})
        </button>
      )}
    </div>
  );
}
`,
            },
          },

          "CelebrationOverlay.tsx": {
            file: {
              contents: `import { useEffect, useState } from "react";

import { cn } from "../lib/utils";

interface CelebrationOverlayProps {
  trigger: boolean;
  variant?: "confetti" | "stars" | "fireworks";
  duration?: number;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  size: number;
}

const EMOJIS: Record<string, string[]> = {
  confetti: ["🎊", "🎉", "✨", "💫", "🌟", "🎈"],
  stars: ["⭐", "🌟", "✨", "💫", "⭐", "🌟"],
  fireworks: ["🎆", "🎇", "✨", "💥", "🎆", "🎇"],
};

export function CelebrationOverlay({
  trigger,
  variant = "confetti",
  duration = 2500,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);

    const emojis = EMOJIS[variant];
    const newParticles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      size: 1.2 + Math.random() * 1.2,
    }));
    setParticles(newParticles);

    const t = setTimeout(() => {
      setVisible(false);
      setParticles([]);
    }, duration);

    return () => clearTimeout(t);
  }, [trigger, variant, duration]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-50 overflow-hidden"
      )}
      aria-live="polite"
      aria-label="Celebration!"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute animate-[celebration-fall_2s_ease-out_forwards]"
          style={{
            left: \`\${p.x}%\`,
            top: "-10%",
            fontSize: \`\${p.size}rem\`,
            animationDelay: \`\${p.delay}s\`,
          }}
        >
          {p.emoji}
        </span>
      ))}

      <style>{\`
        @keyframes celebration-fall {
          0% { transform: translateY(0) rotate(0deg) scale(0); opacity: 1; }
          20% { transform: translateY(15vh) rotate(90deg) scale(1); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg) scale(0.5); opacity: 0; }
        }
      \`}</style>
    </div>
  );
}
`,
            },
          },

          "ChoiceGrid.tsx": {
            file: {
              contents: `import { Check, X } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/utils";

interface ChoiceOption {
  label: string;
  image?: string;
  correct?: boolean;
}

interface ChoiceGridProps {
  options: ChoiceOption[];
  onSelect: (option: ChoiceOption) => void;
}

export function ChoiceGrid({ options, onSelect }: ChoiceGridProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSelect = (opt: ChoiceOption, idx: number) => {
    setSelected(idx);
    setShowFeedback(true);
    onSelect(opt);
    setTimeout(() => {
      setShowFeedback(false);
      setSelected(null);
    }, 1500);
  };

  const cols = options.length <= 2 ? 2 : options.length <= 4 ? 2 : 3;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: \`repeat(\${cols}, minmax(0, 1fr))\` }}
    >
      {options.map((opt, i) => {
        const isSelected = selected === i;
        const isCorrect = opt.correct !== false;
        const showResult = isSelected && showFeedback;

        return (
          <button
            key={i}
            onClick={() => !showFeedback && handleSelect(opt, i)}
            disabled={showFeedback}
            className={cn(
              "board-cell relative min-h-[120px] transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
              showResult && isCorrect && "border-[var(--color-success)]! bg-green-50 scale-105",
              showResult && !isCorrect && "border-red-400! bg-red-50 scale-95 opacity-60"
            )}
            aria-label={opt.label}
          >
            {opt.image && (
              <span className="text-4xl mb-1" role="img" aria-hidden>
                {opt.image}
              </span>
            )}
            <span className="text-sm font-semibold text-center">{opt.label}</span>

            {showResult && (
              <span
                className={cn(
                  "absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full text-white",
                  isCorrect ? "bg-[var(--color-success)]" : "bg-red-500"
                )}
              >
                {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
`,
            },
          },

          "TimerBar.tsx": {
            file: {
              contents: `import * as Progress from "@radix-ui/react-progress";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

interface TimerBarProps {
  duration: number;
  running: boolean;
  onComplete: () => void;
  className?: string;
}

export function TimerBar({ duration, running, onComplete, className }: TimerBarProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const completedRef = useRef(false);

  useEffect(() => {
    if (running && elapsed < duration) {
      completedRef.current = false;
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 0.1;
          if (next >= duration) {
            return duration;
          }
          return next;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, elapsed, duration]);

  useEffect(() => {
    if (elapsed >= duration && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [elapsed, duration, onComplete]);

  useEffect(() => {
    if (!running) setElapsed(0);
  }, [running]);

  const pct = Math.min((elapsed / duration) * 100, 100);
  const remaining = Math.max(Math.ceil(duration - elapsed), 0);

  const barColor =
    pct < 50
      ? "bg-[var(--color-success)]"
      : pct < 80
        ? "bg-[var(--color-celebration)]"
        : "bg-[var(--color-accent)]";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Progress.Root
        className="h-6 overflow-hidden rounded-full bg-[var(--color-border)]"
        value={pct}
      >
        <Progress.Indicator
          className={cn(
            "h-full rounded-full transition-transform duration-100 ease-linear",
            barColor
          )}
          style={{ transform: \`translateX(-\${100 - pct}%)\` }}
        />
      </Progress.Root>

      <div className="flex justify-between text-sm">
        <span className="text-[var(--color-text-muted)]">
          {running ? "Time remaining" : "Ready"}
        </span>
        <span
          className={cn(
            "font-bold tabular-nums font-[var(--font-heading)]",
            pct >= 80 ? "text-[var(--color-accent)]" : "text-[var(--color-primary)]"
          )}
        >
          {remaining}s
        </span>
      </div>
    </div>
  );
}
`,
            },
          },

          "PromptCard.tsx": {
            file: {
              contents: `import { cn } from "../lib/utils";

interface PromptCardProps {
  icon: string;
  title: string;
  instruction: string;
  highlighted?: boolean;
  className?: string;
}

export function PromptCard({
  icon,
  title,
  instruction,
  highlighted = false,
  className,
}: PromptCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] p-5 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        highlighted && "ring-2 ring-[var(--color-primary)] bg-[var(--color-primary-bg)] shadow-[0_4px_16px_rgba(0,89,92,0.15)]",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl",
            highlighted
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-primary-bg)]"
          )}
          role="img"
          aria-hidden
        >
          {icon}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-[var(--font-heading)] text-lg font-bold text-[var(--color-text)]">
            {title}
          </h3>
          <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
            {instruction}
          </p>
        </div>
      </div>
    </div>
  );
}
`,
            },
          },
        },
      },

      hooks: {
        directory: {
          "useLocalStorage.ts": {
            file: {
              contents: `import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }, [key, value]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === "function"
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      return resolved;
    });
  }, []);

  return [value, updateValue];
}
`,
            },
          },

          "useConvexData.ts": {
            file: {
              contents: `import { useState, useEffect, useCallback } from "react";

// Placeholder for cross-device persistence via Convex anonymous auth.
// Falls back to localStorage until Convex client is configured.
// To enable: set VITE_CONVEX_URL env var in the sandbox.

export function useConvexData<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(\`convex_\${key}\`);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(\`convex_\${key}\`, JSON.stringify(value));
    } catch {
      // Storage full
    }
  }, [key, value]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === "function"
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      return resolved;
    });
  }, []);

  return [value, updateValue];
}
`,
            },
          },

          "useAnimation.ts": {
            file: {
              contents: `import { useEffect, useState } from "react";

/**
 * Returns a CSS className that triggers a celebration animation
 * when \`trigger\` transitions to true. The animation class is
 * applied for \`durationMs\` then removed.
 */
export function useAnimation(
  trigger: boolean,
  durationMs: number = 600
): string {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (trigger) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), durationMs);
      return () => clearTimeout(t);
    }
  }, [trigger, durationMs]);

  return animating ? "animate-[bounce-in_400ms_cubic-bezier(0.34,1.56,0.64,1)]" : "";
}
`,
            },
          },

          "useDataCollection.ts": {
            file: {
              contents: `import { useCallback, useState } from "react";

import { useLocalStorage } from "./useLocalStorage";

interface DataConfig {
  type: "trial" | "frequency" | "duration";
  targetCount?: number;
}

interface SessionRecord {
  timestamp: number;
  count: number;
  percentage?: number;
  duration?: number;
}

interface UseDataCollectionReturn {
  count: number;
  percentage: number;
  record: (correct?: boolean) => void;
  reset: () => void;
  sessions: SessionRecord[];
  saveSession: () => void;
}

/**
 * ABA data collection hook for trials, frequency counts, and duration tracking.
 * Persists session history to localStorage.
 */
export function useDataCollection(config: DataConfig): UseDataCollectionReturn {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [sessions, setSessions] = useLocalStorage<SessionRecord[]>(
    \`data-collection-\${config.type}\`,
    []
  );

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  const record = useCallback(
    (isCorrect?: boolean) => {
      if (config.type === "trial") {
        setTotal((t) => t + 1);
        if (isCorrect) setCorrect((c) => c + 1);
      } else {
        setCount((c) => c + 1);
      }
    },
    [config.type]
  );

  const reset = useCallback(() => {
    setCorrect(0);
    setTotal(0);
    setCount(0);
  }, []);

  const saveSession = useCallback(() => {
    const entry: SessionRecord = {
      timestamp: Date.now(),
      count: config.type === "trial" ? total : count,
      percentage: config.type === "trial" ? percentage : undefined,
    };
    setSessions((prev) => [...prev, entry]);
    reset();
  }, [config.type, total, count, percentage, setSessions, reset]);

  return {
    count: config.type === "trial" ? total : count,
    percentage,
    record,
    reset,
    sessions,
    saveSession,
  };
}
`,
            },
          },

          "useSound.ts": {
            file: {
              contents: `import { useCallback, useRef } from "react";

/**
 * Audio playback hook with iOS Safari autoplay handling.
 * On iOS, audio can only play after a user gesture, so we
 * create the Audio element lazily on first play().
 */
export function useSound(src?: string): { play: () => void } {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!src) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(src);
    }

    // Reset to start if already playing
    audioRef.current.currentTime = 0;

    // Play with catch for autoplay restrictions
    audioRef.current.play().catch(() => {
      // Autoplay blocked — silently ignore (common on iOS first interaction)
    });
  }, [src]);

  return { play };
}
`,
            },
          },
        },
      },
    },
  },
};
