interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

const SUGGESTIONS = [
  { label: "Colors", prompt: "Make flashcards for basic colors like red, blue, green, yellow" },
  { label: "Farm Animals", prompt: "Create a farm animals flashcard deck with common animals" },
  { label: "Feelings", prompt: "Make emotion flashcards for a 3-year-old: happy, sad, angry, scared" },
  { label: "Food", prompt: "Create flashcards for common foods: apple, banana, milk, bread, cookie" },
  { label: "Body Parts", prompt: "Make flashcards for body parts: eyes, nose, mouth, hands, feet" },
];

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          onClick={() => onSelect(s.prompt)}
          className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-medium text-on-surface transition-colors duration-300 hover:bg-primary/10 hover:text-primary"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
