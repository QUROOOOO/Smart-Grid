import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export type ExpressiveCardVariant = "elevated" | "tonal" | "brand" | "obsidian" | "outline";

export interface ExpressiveCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ExpressiveCardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

const VARIANTS: Record<ExpressiveCardVariant, string> = {
  elevated: "bg-surface text-ink shadow-soft ring-1 ring-borderSubtle/60",
  tonal: "bg-surfaceTonal text-ink ring-1 ring-borderSubtle/40",
  brand: "bg-brand text-white shadow-lifted ring-1 ring-brandHover/40",
  obsidian: "bg-obsidian text-canvas shadow-lifted ring-1 ring-obsidian/20",
  outline: "bg-transparent text-ink ring-1 ring-borderSubtle",
};

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const ExpressiveCard = forwardRef<HTMLDivElement, ExpressiveCardProps>(
  ({ variant = "elevated", padding = "md", interactive = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[28px] transition-all duration-300 ease-expressive",
        VARIANTS[variant],
        PADDING[padding],
        interactive && "hover:-translate-y-0.5 hover:shadow-lifted cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ExpressiveCard.displayName = "ExpressiveCard";

export function CardLabel({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
