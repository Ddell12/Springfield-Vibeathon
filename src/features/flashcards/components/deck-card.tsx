import { MaterialIcon } from "@/shared/components/material-icon";

interface DeckCardProps {
  title: string;
  cardCount: number;
  coverImageUrl?: string;
  isActive: boolean;
  onClick: () => void;
}

export function DeckCard({ title, cardCount, coverImageUrl, isActive, onClick }: DeckCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 ${
        isActive
          ? "border-l-4 border-primary bg-surface-container-lowest shadow-sm text-primary"
          : "text-on-surface hover:bg-surface-container-low"
      }`}
    >
      <div
        className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg ${
          isActive
            ? "bg-primary-container/10 text-primary"
            : "bg-surface-container-highest text-on-surface-variant"
        } flex items-center justify-center`}
      >
        {coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <MaterialIcon icon="collections_bookmark" size="xs" className={isActive ? "text-primary" : "text-on-surface-variant/40"} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${isActive ? "font-bold text-primary" : "font-medium"}`}>{title}</p>
        <p className="text-xs text-on-surface-variant">{cardCount} card{cardCount !== 1 ? "s" : ""}</p>
      </div>
    </button>
  );
}
