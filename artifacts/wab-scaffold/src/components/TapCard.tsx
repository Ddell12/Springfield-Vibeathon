import { cn } from "@/lib/utils";

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
