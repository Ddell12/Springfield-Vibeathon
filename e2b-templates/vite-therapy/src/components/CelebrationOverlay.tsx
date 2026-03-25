import { useEffect, useState } from "react";

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
            left: `${p.x}%`,
            top: "-10%",
            fontSize: `${p.size}rem`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}

      <style>{`
        @keyframes celebration-fall {
          0% { transform: translateY(0) rotate(0deg) scale(0); opacity: 1; }
          20% { transform: translateY(15vh) rotate(90deg) scale(1); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
