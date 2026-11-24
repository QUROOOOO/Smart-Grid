import { cn } from "../lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", size = "md", className }: BadgeProps) {
  const variants = {
    default: "bg-hairline text-mutedInk",
    success: "bg-mutedEmeraldSubtle text-mutedEmerald border border-mutedEmerald/30",
    warning: "bg-gridOrangeSubtle text-gridOrange border border-gridOrange/30",
    danger: "bg-red-500/10 text-red-400 border border-red-500/30",
    info: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded border",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}