import { forwardRef, type HTMLAttributes } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { M3_SPRING_DEFAULT_SPATIAL } from "../lib/motion";

export type ExpressiveCardVariant = "elevated" | "tonal" | "brand" | "obsidian" | "outline";

export interface ExpressiveCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ExpressiveCardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  staggerIndex?: number;
}

const VARIANTS: Record<ExpressiveCardVariant, string> = {
  elevated: "bg-surface text-ink shadow-soft ring-1 ring-borderSubtle/60",
  tonal: "bg-surfaceTonal text-ink ring-1 ring-borderSubtle/40",
  brand: "bg-brand text-onBrand shadow-lifted ring-1 ring-brandRim/40",
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
  (
    { variant = "elevated", padding = "md", interactive = false, staggerIndex, className, children, ...props },
    ref
  ) => (
    <motion.div
      ref={ref}
      initial={staggerIndex === undefined ? false : { opacity: 0, y: 12 }}
      animate={staggerIndex === undefined ? undefined : { opacity: 1, y: 0 }}
      transition={{ ...M3_SPRING_DEFAULT_SPATIAL, delay: (staggerIndex ?? 0) * 0.035 }}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      className={cn(
        "rounded-[28px] transition-colors duration-300",
        VARIANTS[variant],
        PADDING[padding],
        interactive && "cursor-pointer hover:shadow-lifted",
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
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
