import { Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

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
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
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
