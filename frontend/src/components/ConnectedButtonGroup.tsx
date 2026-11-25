import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export interface ConnectedOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface ConnectedButtonGroupProps {
  options: ConnectedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

const SPRING = { type: "spring", stiffness: 380, damping: 28, mass: 0.9 } as const;

export function ConnectedButtonGroup({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: ConnectedButtonGroupProps) {
  const layoutId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-surfaceTonal p-1 ring-1 ring-borderSubtle/50",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap outline-none",
              "transition-colors duration-200",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              selected ? "text-white" : "text-inkSecondary hover:text-ink"
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING}
                className="absolute inset-0 rounded-full bg-brand shadow-pill"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
