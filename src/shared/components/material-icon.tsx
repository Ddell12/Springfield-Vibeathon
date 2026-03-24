import { cn } from "@/core/utils";

type MaterialIconProps = {
  icon: string;
  filled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeMap = { sm: "text-lg", md: "text-2xl", lg: "text-3xl", xl: "text-4xl" };

export function MaterialIcon({ icon, filled = false, className, size = "md" }: MaterialIconProps) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", sizeMap[size], className)}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
    >
      {icon}
    </span>
  );
}
