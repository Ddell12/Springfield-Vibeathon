import { motion } from "motion/react";

import { cn } from "@/lib/utils";

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
