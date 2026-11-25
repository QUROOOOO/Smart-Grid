import { cn } from "../lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", size = "md", className }: BadgeProps) {
  const variants = {
    default: "bg-surfaceTonal text-inkSecondary ring-1 ring-borderSubtle/60",
    success: "bg-brandWash text-brand ring-1 ring-brand/20",
    warning: "bg-brand text-onBrand ring-1 ring-brandHover/40",
    danger: "bg-ink text-canvas ring-1 ring-ink/20",
    info: "bg-brandWash text-brandVivid ring-1 ring-brand/15",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-[11px]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold tracking-wide",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
