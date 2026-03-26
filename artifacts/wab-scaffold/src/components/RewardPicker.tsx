import { useState } from "react";

import { cn } from "@/lib/utils";

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
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
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
