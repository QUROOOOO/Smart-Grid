import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { M3_FAST_SPATIAL } from "../lib/motion";

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
  const last = options.length - 1;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-[2px]", className)}
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
            animate={{ scaleX: selected ? 1.05 : neighbor ? 0.95 : 1 }}
            whileTap={{ scaleX: 0.94 }}
            transition={M3_FAST_SPATIAL}
            style={{ transformOrigin: "center" }}
            className={cn(
              "relative flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold outline-none transition-colors duration-150",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              i === 0 ? "rounded-l-full rounded-r-[8px]" : "",
              i === last && last > 0 ? "rounded-r-full rounded-l-[8px]" : "",
              i > 0 && i < last ? "rounded-[8px]" : "",
              selected
                ? "text-onBrand"
                : "bg-surfaceTonal text-inkSecondary hover:bg-surfaceHover hover:text-ink"
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                transition={M3_FAST_SPATIAL}
                animate={{ borderRadius: 9999 }}
                className="absolute inset-0 rounded-full bg-brand shadow-pill dark:ring-1 dark:ring-brandVivid"
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
