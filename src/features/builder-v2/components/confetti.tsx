"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  dy: number;
};

const COLORS = ["#00595c", "#4e52ba", "#7a401c", "#0d7377", "#8f93ff", "#975731"];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 8,
    angle: Math.random() * 360,
    dy: -120 + Math.random() * 240,
  }));
}

type ConfettiProps = {
  trigger: boolean;
};

export function Confetti({ trigger }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- confetti must render immediately on trigger
      setParticles(generateParticles(30));
      const timer = setTimeout(() => {
        setParticles([]);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [trigger]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
          aria-hidden="true"
        >
          {particles.map((p) => (
            <motion.div
              key={p.id}
              data-testid="confetti-particle"
              className="confetti-particle absolute rounded-sm"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                rotate: p.angle,
              }}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: p.dy, scale: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
