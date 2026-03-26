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
            "class-variance-authority": "^0.7.1",
            clsx: "^2.1.1",
            "lucide-react": "^0.469.0",
            motion: "^12.0.0",
            "radix-ui": "^1.4.3",
            react: "19.0.0",
            "react-dom": "19.0.0",
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
          overrides: {
            react: "19.0.0",
            "react-dom": "19.0.0",
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
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
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
  plugins: [tailwindcss(), react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom/client",
      "lucide-react",
      "radix-ui",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
    ],
  },
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

  /* shadcn semantic tokens */
  --color-background: #fafafa;
  --color-foreground: #1a1a2e;
  --color-card: #ffffff;
  --color-card-foreground: #1a1a2e;
  --color-primary-foreground: #ffffff;
  --color-secondary-foreground: #ffffff;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #6b7280;
  --color-accent-foreground: #ffffff;
  --color-destructive: #dc2626;
  --color-input: #e5e7eb;
  --color-ring: #00595c;
  --color-surface-container-high: #f0f0f0;
  --color-surface-container-lowest: #ffffff;
  --color-primary-container: #0d7377;
  --radius: 0.75rem;
}

@layer base {
  @keyframes animate-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes animate-out {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(4px); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes fade-out {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes zoom-in {
    from { transform: scale(0.95); }
    to   { transform: scale(1); }
  }
  @keyframes zoom-out {
    from { transform: scale(1); }
    to   { transform: scale(0.95); }
  }
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

/* Enhanced layout utilities */
.hero-section {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  color: white;
  border-radius: 1.5rem;
  padding: 2rem;
  text-align: center;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

/* Therapy-specific utilities */
.tap-target-lg {
  min-height: 56px;
  min-width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  border-radius: 9999px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Reward animation */
@keyframes reward-burst {
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}
.reward-burst {
  animation: reward-burst 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Typography helpers */
.heading-display {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.heading-serif {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
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

      ui: {
        directory: {
          "index.ts": {
            file: {
              contents: `export { Button, buttonVariants } from "./button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "./card";
export { Badge, badgeVariants } from "./badge";
export { Input } from "./input";
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants } from "./tabs";
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogPortal, DialogOverlay } from "./dialog";
export { Separator } from "./separator";
export { Label } from "./label";
`,
            },
          },

          "button.tsx": {
            file: {
              contents: `import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)] text-white hover:opacity-90",
        destructive: "bg-[var(--color-destructive)] text-white hover:opacity-90",
        outline: "border-2 border-[var(--color-border)] bg-white hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]",
        secondary: "bg-[var(--color-muted)] text-[var(--color-text)] hover:opacity-80",
        ghost: "hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition-all duration-300",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 gap-1.5 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
`,
            },
          },

          "card.tsx": {
            file: {
              contents: `import * as React from "react";

import { cn } from "../lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex flex-col gap-6 rounded-2xl bg-[var(--color-card)] py-6 text-[var(--color-card-foreground)] shadow-sm", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("grid auto-rows-min gap-2 px-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("leading-none font-semibold", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-sm text-[var(--color-muted-foreground)]", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center px-6", className)} {...props} />;
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
`,
            },
          },

          "badge.tsx": {
            file: {
              contents: `import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)] text-white",
        secondary: "bg-[var(--color-muted)] text-[var(--color-text)]",
        destructive: "bg-[var(--color-destructive)] text-white",
        outline: "border-[var(--color-border)] text-[var(--color-text)]",
        ghost: "hover:bg-[var(--color-primary-bg)]",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
`,
            },
          },

          "input.tsx": {
            file: {
              contents: `import * as React from "react";

import { cn } from "../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border-2 border-transparent bg-[var(--color-surface-container-high)] px-3 py-1 text-base transition-all duration-300 outline-none placeholder:text-[var(--color-muted-foreground)] disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--color-surface-container-lowest)]",
        className
      )}
      {...props}
    />
  );
}

export { Input };
`,
            },
          },

          "tabs.tsx": {
            file: {
              contents: `import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-[var(--color-muted-foreground)] group-data-[orientation=horizontal]/tabs:h-9",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-muted)]",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-[var(--color-text)]/60 transition-all hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-white data-[state=active]:text-[var(--color-text)] data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, tabsListVariants, TabsTrigger };
`,
            },
          },

          "dialog.tsx": {
            file: {
              contents: `import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../lib/utils";
import { Button } from "./button";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-black/50", className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-white p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />;
}

function DialogFooter({ className, showCloseButton = false, children, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-lg leading-none font-semibold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-[var(--color-muted-foreground)]", className)} {...props} />;
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
`,
            },
          },

          "separator.tsx": {
            file: {
              contents: `import { Separator as SeparatorPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-[var(--color-border)] data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
`,
            },
          },

          "label.tsx": {
            file: {
              contents: `import { Label as LabelPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "../lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
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
export { TapCard } from "./TapCard";
export { SentenceStrip } from "./SentenceStrip";
export { BoardGrid } from "./BoardGrid";
export { StepItem } from "./StepItem";
export { PageViewer } from "./PageViewer";
export { TokenSlot } from "./TokenSlot";
export { RewardPicker } from "./RewardPicker";
export { SocialStory } from "./SocialStory";
`,
            },
          },

          "TherapyCard.tsx": {
            file: {
              contents: `import { cva, type VariantProps } from "class-variance-authority";
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
  children: ReactNode;
}

export function TherapyCard({
  variant,
  className,
  children,
  ...props
}: TherapyCardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props}>
      {children}
    </div>
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

      <div
        className="h-2.5 overflow-hidden rounded-full bg-[var(--color-border)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[var(--color-success)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: \`\${pct}%\` }}
        />
      </div>

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
              contents: `import { useEffect, useRef, useState } from "react";

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
      <div
        className="h-6 overflow-hidden rounded-full bg-[var(--color-border)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-100 ease-linear",
            barColor
          )}
          style={{ width: \`\${pct}%\` }}
        />
      </div>

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
          "TapCard.tsx": {
            file: {
              contents: `import { cn } from "../lib/utils";

interface TapCardProps {
  image: string;
  label: string;
  onTap: () => void;
  size?: "sm" | "md" | "lg";
  highlighted?: boolean;
}

const sizeClasses = {
  sm: "min-h-[80px] min-w-[80px] p-2",
  md: "min-h-[100px] min-w-[100px] p-3",
  lg: "min-h-[120px] min-w-[120px] p-4",
};

const imgSizeClasses = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-20 h-20",
};

export function TapCard({
  image,
  label,
  onTap,
  size = "md",
  highlighted = false,
}: TapCardProps) {
  return (
    <button
      onClick={onTap}
      aria-label={label}
      className={cn(
        "board-cell flex flex-col items-center justify-center gap-2 cursor-pointer select-none",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "active:scale-90",
        sizeClasses[size],
        highlighted && "border-[var(--color-primary)]! shadow-[0_0_0_3px_rgba(0,89,92,0.2)]"
      )}
    >
      {image.startsWith("http") || image.startsWith("/") ? (
        <img
          src={image}
          alt={label}
          className={cn("object-cover rounded-[var(--radius-sm)]", imgSizeClasses[size])}
        />
      ) : (
        <span
          className="text-4xl"
          role="img"
          aria-hidden="true"
        >
          {image}
        </span>
      )}
      <span className="text-sm font-semibold text-center leading-tight text-[var(--color-text)]">
        {label}
      </span>
    </button>
  );
}
`,
            },
          },

          "SentenceStrip.tsx": {
            file: {
              contents: `import { Volume2, X } from "lucide-react";

import { cn } from "../lib/utils";
import { useTTS } from "../hooks/useTTS";

interface WordChip {
  label: string;
  audioUrl?: string;
}

interface SentenceStripProps {
  words: WordChip[];
  onPlay: () => void;
  onClear: () => void;
}

export function SentenceStrip({ words, onPlay, onClear }: SentenceStripProps) {
  const { speak, speaking } = useTTS();

  const handlePlay = () => {
    const sentence = words.map((w) => w.label).join(" ");
    speak(sentence);
    onPlay();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-[var(--radius-lg)]",
        "bg-[var(--color-primary-bg)] min-h-[64px]"
      )}
      role="region"
      aria-label="Sentence strip"
    >
      <div className="flex flex-1 flex-wrap gap-1.5 min-h-[40px] items-center">
        {words.length === 0 ? (
          <span className="text-sm text-[var(--color-text-muted)] italic px-1">
            Tap words to build a sentence
          </span>
        ) : (
          words.map((word, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",
                "bg-[var(--color-primary)] text-white"
              )}
            >
              {word.label}
            </span>
          ))
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handlePlay}
          disabled={words.length === 0 || speaking}
          aria-label="Read sentence aloud"
          className={cn(
            "tap-target h-10 w-10 rounded-full transition-all duration-200",
            "bg-[var(--color-primary)] text-white",
            "hover:bg-[var(--color-primary-light)] disabled:opacity-40 disabled:cursor-not-allowed",
            speaking && "animate-pulse"
          )}
        >
          <Volume2 className="h-5 w-5" />
        </button>

        <button
          onClick={onClear}
          disabled={words.length === 0}
          aria-label="Clear sentence"
          className={cn(
            "tap-target h-10 w-10 rounded-full transition-all duration-200",
            "bg-[var(--color-border)] text-[var(--color-text-muted)]",
            "hover:bg-red-100 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
`,
            },
          },

          "BoardGrid.tsx": {
            file: {
              contents: `import type { ReactNode } from "react";

interface BoardGridProps {
  columns?: number;
  gap?: number;
  children: ReactNode;
}

export function BoardGrid({ columns = 3, gap = 12, children }: BoardGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\`,
        gap: \`\${gap}px\`,
      }}
    >
      {children}
    </div>
  );
}
`,
            },
          },

          "StepItem.tsx": {
            file: {
              contents: `import { Check } from "lucide-react";

import { cn } from "../lib/utils";

interface StepItemProps {
  image?: string;
  label: string;
  status: "pending" | "current" | "done";
  onComplete: () => void;
}

export function StepItem({ image, label, status, onComplete }: StepItemProps) {
  return (
    <button
      onClick={status !== "done" ? onComplete : undefined}
      disabled={status === "done"}
      aria-label={\`\${status === "done" ? "Completed" : status === "current" ? "Current step" : "Upcoming"}: \${label}\`}
      className={cn(
        "schedule-step w-full text-left min-h-[60px]",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        status === "done" && "completed",
        status === "current" && "ring-2 ring-[var(--color-primary)] ring-offset-1"
      )}
    >
      {image && (
        <span
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-primary-bg)] text-xl"
          )}
          role="img"
          aria-hidden="true"
        >
          {image}
        </span>
      )}

      <span
        className={cn(
          "step-text flex-1 font-medium text-[var(--color-text)]",
          status === "current" && "font-bold text-[var(--color-primary)]",
          status === "done" && "text-[var(--color-text-muted)]"
        )}
      >
        {label}
      </span>

      <span className="flex-shrink-0">
        {status === "done" ? (
          <Check className="h-5 w-5 text-[var(--color-success)]" />
        ) : status === "current" ? (
          <span className="text-xs rounded-full bg-[var(--color-primary-bg)] px-2 py-0.5 font-semibold text-[var(--color-primary)]">
            NOW
          </span>
        ) : null}
      </span>
    </button>
  );
}
`,
            },
          },

          "PageViewer.tsx": {
            file: {
              contents: `import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/utils";
import { useTTS } from "../hooks/useTTS";

interface StoryPage {
  image: string;
  text: string;
  audioUrl?: string;
}

interface PageViewerProps {
  pages: StoryPage[];
  onPageChange?: (index: number) => void;
}

export function PageViewer({ pages, onPageChange }: PageViewerProps) {
  const [current, setCurrent] = useState(0);
  const { speak, speaking } = useTTS();
  const page = pages[current];

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, idx));
    setCurrent(clamped);
    onPageChange?.(clamped);
  };

  const handleSpeak = () => {
    if (page) speak(page.text, page.audioUrl);
  };

  if (!page) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Image */}
      <div
        className={cn(
          "w-full rounded-[var(--radius-xl)] overflow-hidden",
          "bg-[var(--color-border)] flex items-center justify-center",
          "min-h-[200px]"
        )}
      >
        {page.image.startsWith("http") || page.image.startsWith("/") ? (
          <img
            src={page.image}
            alt={page.text}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-8xl" role="img" aria-label={page.text}>
            {page.image}
          </span>
        )}
      </div>

      {/* Text + speak */}
      <div className="flex items-start gap-3">
        <p className="flex-1 text-lg font-medium text-[var(--color-text)] leading-relaxed">
          {page.text}
        </p>
        <button
          onClick={handleSpeak}
          disabled={speaking}
          aria-label="Read page aloud"
          className={cn(
            "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
            "bg-[var(--color-primary-bg)] text-[var(--color-primary)]",
            "hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-200",
            "disabled:opacity-40",
            speaking && "animate-pulse"
          )}
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          aria-label="Previous page"
          className={cn(
            "tap-target h-12 w-12 rounded-full flex items-center justify-center",
            "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
            "hover:bg-[var(--color-primary-bg)] transition-colors duration-200",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Page dots */}
        <div className="flex gap-2" role="tablist" aria-label="Pages">
          {pages.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === current}
              aria-label={\`Page \${i + 1}\`}
              onClick={() => goTo(i)}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                i === current
                  ? "w-6 bg-[var(--color-primary)]"
                  : "w-2.5 bg-[var(--color-border)] hover:bg-[var(--color-primary-light)]"
              )}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(current + 1)}
          disabled={current === pages.length - 1}
          aria-label="Next page"
          className={cn(
            "tap-target h-12 w-12 rounded-full flex items-center justify-center",
            "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
            "hover:bg-[var(--color-primary-bg)] transition-colors duration-200",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Page {current + 1} of {pages.length}
      </p>
    </div>
  );
}
`,
            },
          },

          "TokenSlot.tsx": {
            file: {
              contents: `import { motion } from "motion/react";

import { cn } from "../lib/utils";

interface TokenSlotProps {
  filled: boolean;
  icon?: string;
  onEarn?: () => void;
}

export function TokenSlot({ filled, icon = "⭐", onEarn }: TokenSlotProps) {
  return (
    <motion.button
      onClick={!filled && onEarn ? onEarn : undefined}
      disabled={filled || !onEarn}
      whileTap={!filled && onEarn ? { scale: 0.9 } : undefined}
      aria-label={filled ? "Token earned" : "Earn token"}
      className={cn(
        "h-14 w-14 rounded-full flex items-center justify-center",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        filled
          ? "bg-[var(--color-celebration)] shadow-[0_0_16px_rgba(255,215,0,0.5)]"
          : "bg-[var(--color-border)]",
        !filled && onEarn && "cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] hover:ring-offset-2"
      )}
    >
      <motion.span
        key={filled ? "filled" : "empty"}
        initial={filled ? { scale: 0 } : { scale: 1 }}
        animate={{ scale: 1 }}
        transition={
          filled
            ? { type: "spring", stiffness: 400, damping: 15 }
            : { duration: 0 }
        }
        className="text-2xl"
        role="img"
        aria-hidden="true"
      >
        {filled ? icon : "○"}
      </motion.span>
    </motion.button>
  );
}
`,
            },
          },

          "RewardPicker.tsx": {
            file: {
              contents: `import { useState } from "react";

import { cn } from "../lib/utils";

interface Reward {
  label: string;
  image?: string;
}

interface RewardPickerProps {
  rewards: Reward[];
  onSelect: (reward: Reward) => void;
}

export function RewardPicker({ rewards, onSelect }: RewardPickerProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (reward: Reward, idx: number) => {
    setSelected(idx);
    onSelect(reward);
  };

  const cols = rewards.length <= 2 ? 2 : rewards.length <= 4 ? 2 : 3;

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: \`repeat(\${cols}, minmax(0, 1fr))\` }}
      role="group"
      aria-label="Choose your reward"
    >
      {rewards.map((reward, i) => (
        <button
          key={i}
          onClick={() => handleSelect(reward, i)}
          aria-label={reward.label}
          aria-pressed={selected === i}
          className={cn(
            "board-cell min-h-[100px] flex flex-col items-center justify-center gap-2",
            "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            selected === i
              ? "border-[var(--color-primary)]! bg-[var(--color-primary-bg)] scale-105 shadow-[0_0_0_3px_rgba(0,89,92,0.15)]"
              : "hover:border-[var(--color-primary-light)]"
          )}
        >
          {reward.image ? (
            reward.image.startsWith("http") || reward.image.startsWith("/") ? (
              <img
                src={reward.image}
                alt={reward.label}
                className="w-14 h-14 object-cover rounded-[var(--radius-sm)]"
              />
            ) : (
              <span className="text-4xl" role="img" aria-hidden="true">
                {reward.image}
              </span>
            )
          ) : null}
          <span className="text-sm font-semibold text-center leading-tight">
            {reward.label}
          </span>
        </button>
      ))}
    </div>
  );
}
`,
            },
          },

          "SocialStory.tsx": {
            file: {
              contents: `import { PageViewer } from "./PageViewer";

interface StoryPage {
  image: string;
  text: string;
  audioUrl?: string;
}

interface SocialStoryProps {
  title: string;
  pages: StoryPage[];
  onPageChange?: (index: number) => void;
  onComplete?: () => void;
}

export function SocialStory({ title, pages, onPageChange, onComplete }: SocialStoryProps) {
  const handlePageChange = (index: number) => {
    onPageChange?.(index);
    if (index === pages.length - 1) {
      onComplete?.();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="tool-title text-xl">{title}</h2>
      <PageViewer pages={pages} onPageChange={handlePageChange} />
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
          "useTTS.ts": {
            file: {
              contents: `import { useCallback, useEffect, useRef, useState } from "react";

type TTSCache = Map<string, string>;

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const cache = useRef<TTSCache>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback((url: string) => {
    setSpeaking(true);
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.onended = () => setSpeaking(false);
    audioRef.current.onerror = () => setSpeaking(false);
    audioRef.current.play().catch(() => setSpeaking(false));
  }, []);

  const speak = useCallback((text: string, audioUrl?: string) => {
    if (audioUrl) {
      cache.current.set(text, audioUrl);
      playAudio(audioUrl);
      return;
    }
    const cached = cache.current.get(text);
    if (cached) {
      playAudio(cached);
      return;
    }
    if (window.parent !== window) {
      window.parent.postMessage({ type: "tts-request", text }, "*");
    }
  }, [playAudio]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "tts-response") {
        const { text, audioUrl } = event.data;
        cache.current.set(text, audioUrl);
        playAudio(audioUrl);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [playAudio]);

  return { speak, speaking };
}
`,
            },
          },

          "useSTT.ts": {
            file: {
              contents: `import { useCallback, useEffect, useState } from "react";

export function useSTT() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);

  const startListening = useCallback(() => {
    setListening(true);
    setTranscript("");
    if (window.parent !== window) {
      window.parent.postMessage({ type: "stt-start" }, "*");
    }
  }, []);

  const stopListening = useCallback(() => {
    setListening(false);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "stt-stop" }, "*");
    }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "stt-result") {
        setTranscript(event.data.transcript);
        setListening(false);
      }
      if (event.data?.type === "stt-interim") {
        setTranscript(event.data.transcript);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return { transcript, listening, startListening, stopListening };
}
`,
            },
          },

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
