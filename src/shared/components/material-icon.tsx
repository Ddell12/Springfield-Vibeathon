import { cn } from "@/core/utils";

type MaterialIconProps = {
  icon: string;
  filled?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
};

const sizeMap = { xs: "text-base", sm: "text-lg", md: "text-2xl", lg: "text-3xl", xl: "text-4xl", "2xl": "text-7xl" };

export function MaterialIcon({ icon, filled = false, className, size = "md" }: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined select-none", sizeMap[size], className)}
      style={{
        fontFamily: "'Material Symbols Outlined'",
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
    >
      {icon}
    </span>
  );
}
