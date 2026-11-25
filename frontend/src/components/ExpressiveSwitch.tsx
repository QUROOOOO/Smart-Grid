import { motion } from "motion/react";
import { cn } from "../lib/utils";

export interface ExpressiveSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function ExpressiveSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: ExpressiveSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex items-center gap-3 text-left outline-none disabled:opacity-50",
        className
      )}
    >
      <motion.span
        whileTap={{ scale: 0.96 }}
        className={cn(
          "relative flex h-8 w-14 flex-shrink-0 items-center rounded-full p-1 transition-colors duration-300",
          checked ? "bg-brand" : "bg-surfaceHover"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "block h-6 w-6 rounded-full bg-white shadow-pill",
            checked && "ml-auto"
          )}
        />
      </motion.span>
      {(label || description) && (
        <span className="min-w-0">
          {label && (
            <span className="block text-sm font-semibold text-ink">{label}</span>
          )}
          {description && (
            <span className="block text-xs text-inkMuted">{description}</span>
          )}
        </span>
      )}
    </button>
  );
}
