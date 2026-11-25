import { cn } from "../lib/utils";

export interface M3IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

export function M3Icon({ name, filled = false, size = 20, className }: M3IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-rounded select-none", className)}
      style={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${filled ? 600 : 500}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
      }}
    >
      {name}
    </span>
  );
}
