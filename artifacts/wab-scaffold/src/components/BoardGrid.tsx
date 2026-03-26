import type { ReactNode } from "react";

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
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap}px`,
      }}
    >
      {children}
    </div>
  );
}
