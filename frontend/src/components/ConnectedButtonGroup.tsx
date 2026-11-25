import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { M3_SPRING_FAST_SPATIAL } from "../lib/motion";

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

export function ConnectedButtonGroup({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: ConnectedButtonGroupProps) {
  const layoutId = useId();
  const selectedIndex = options.findIndex((o) => o.value === value);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-surfaceTonal p-1 ring-1 ring-borderSubtle/50",
        className
      )}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        const neighbor = Math.abs(i - selectedIndex) === 1;
        return (
          <motion.button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            animate={{ scaleX: selected ? 1.04 : neighbor ? 0.96 : 1 }}
            whileTap={{ scaleX: 0.94 }}
            transition={M3_SPRING_FAST_SPATIAL}
            style={{ transformOrigin: "center" }}
            className={cn(
              "relative flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold outline-none",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              selected ? "text-white" : "text-inkSecondary hover:text-ink"
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                transition={M3_SPRING_FAST_SPATIAL}
                animate={{ borderRadius: 9999 }}
                className="absolute inset-0 rounded-full bg-brand shadow-pill"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
