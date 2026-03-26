// Golden reference examples for the therapy app builder LLM agent.
// These demonstrate how to combine shadcn UI components (from "./ui")
// with pre-built therapy components (from "./components").

export function getFewShotExamples(): string {
  return `
<example name="Star Reward Board">
A star token economy board for ABA therapy. Children earn stars for completing tasks.
When the goal is reached, a celebration overlay triggers.

\`\`\`tsx
// src/App.tsx
import { useState, useCallback } from "react";
import { Star, RotateCcw, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardHeader, CardContent, CardTitle } from "./ui";
import { Button } from "./ui";
import { TokenBoard, CelebrationOverlay } from "./components";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { cn } from "./lib/utils";

const TASKS = [
  { id: "1", label: "Morning Routine", done: false },
  { id: "2", label: "Brush Teeth", done: false },
  { id: "3", label: "Get Dressed", done: false },
  { id: "4", label: "Eat Breakfast", done: false },
  { id: "5", label: "Pack Backpack", done: false },
];

export default function App() {
  const [tasks, setTasks] = useLocalStorage("star-board-tasks", TASKS);
  const [showCelebration, setShowCelebration] = useState(false);

  const earned = tasks.filter((t) => t.done).length;
  const goal = tasks.length;

  const handleEarn = useCallback(() => {
    setTasks((prev) => {
      const next = [...prev];
      const idx = next.findIndex((t) => !t.done);
      if (idx !== -1) {
        next[idx] = { ...next[idx], done: true };
        if (next.filter((t) => t.done).length >= goal) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 2500);
        }
      }
      return next;
    });
  }, [setTasks, goal]);

  const handleReset = useCallback(() => {
    setTasks(TASKS);
  }, [setTasks]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-primary-bg)] to-white p-4 md:p-8">
      <CelebrationOverlay trigger={showCelebration} variant="stars" />

      <div className="mx-auto max-w-lg">
        <Card className="mb-6 border-0 shadow-xl">
          <CardHeader className="rounded-t-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] text-center">
            <div className="flex items-center justify-center gap-3 pb-2">
              <div className="rounded-full bg-white/20 p-2">
                <Trophy className="h-8 w-8 text-[var(--color-celebration)]" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold font-[Nunito] text-white">
              My Star Board
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <TokenBoard goal={goal} earned={earned} onEarn={handleEarn} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-6">
          <AnimatePresence>
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-4 shadow-md transition-all duration-300",
                    task.done
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                      : "bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300",
                      task.done
                        ? "bg-gradient-to-br from-[var(--color-success)] to-emerald-600"
                        : "bg-[var(--color-primary-bg)]"
                    )}
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        task.done ? "fill-white text-white" : "text-[var(--color-primary)]"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-base font-semibold",
                      task.done ? "text-[var(--color-success)] line-through" : "text-[var(--color-text)]"
                    )}
                  >
                    {task.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2 border-2 border-[var(--color-primary)]/20 text-[var(--color-primary)]"
          >
            <RotateCcw className="h-4 w-4" />
            Start Over
          </Button>
        </div>
      </div>
    </div>
  );
}
\`\`\`
</example>

<example name="Snack Request Board">
An AAC communication board for snack time. Children tap picture cards to build a sentence strip.
Uses a responsive grid of tappable picture cards with a sentence strip at the bottom.

\`\`\`tsx
// src/App.tsx
import { useState } from "react";
import { X, Volume2 } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "./ui";
import { BoardGrid, TapCard, SentenceStrip } from "./components";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { cn } from "./lib/utils";

const SNACK_ITEMS = [
  { id: "apple",   label: "Apple",   emoji: "🍎", category: "fruit" },
  { id: "banana",  label: "Banana",  emoji: "🍌", category: "fruit" },
  { id: "crackers",label: "Crackers",emoji: "🍘", category: "snack" },
  { id: "cheese",  label: "Cheese",  emoji: "🧀", category: "snack" },
  { id: "juice",   label: "Juice",   emoji: "🧃", category: "drink" },
  { id: "water",   label: "Water",   emoji: "💧", category: "drink" },
  { id: "grapes",  label: "Grapes",  emoji: "🍇", category: "fruit" },
  { id: "yogurt",  label: "Yogurt",  emoji: "🥛", category: "snack" },
];

const CATEGORIES = ["all", "fruit", "snack", "drink"] as const;

export default function App() {
  const [sentence, setSentence] = useLocalStorage<string[]>("snack-sentence", []);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? SNACK_ITEMS
    : SNACK_ITEMS.filter((item) => item.category === filter);

  const handleTap = (label: string) => {
    setSentence((prev) => [...prev, label]);
  };

  const handleClear = () => setSentence([]);

  const words = sentence.map((w) => ({ label: w }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-primary-bg)] to-white flex flex-col">
      <header className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] px-4 py-5 text-center shadow-lg">
        <h1 className="text-2xl font-bold font-[Nunito] text-white">Snack Time!</h1>
        <p className="mt-1 text-sm text-white/80">Tap what you want</p>
      </header>

      <div className="flex gap-2 px-4 pt-4 pb-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <motion.div key={cat} whileTap={{ scale: 0.95 }}>
            <Badge
              variant={filter === cat ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1 text-sm capitalize transition-all duration-200",
                filter === cat && "bg-[var(--color-primary)] text-white border-transparent"
              )}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </Badge>
          </motion.div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <BoardGrid columns={4} gap={3}>
          {filtered.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
            >
              <TapCard
                label={item.label}
                image={item.emoji}
                onTap={() => handleTap(item.label)}
                size="md"
              />
            </motion.div>
          ))}
        </BoardGrid>
      </div>

      <div className="sticky bottom-0 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-sm p-3">
        <SentenceStrip
          words={words}
          onPlay={() => {}}
          onClear={handleClear}
        />
      </div>
    </div>
  );
}
\`\`\`
</example>
`.trim();
}
