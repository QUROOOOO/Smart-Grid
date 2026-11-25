import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { M3_FAST_SPATIAL } from "../lib/motion";

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
        "group inline-flex items-center gap-3 text-left outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <motion.span
        aria-hidden="true"
        whileTap={{ scale: 0.97 }}
        transition={M3_FAST_SPATIAL}
        className={cn(
          "relative box-border inline-flex h-[32px] w-[52px] shrink-0 items-center rounded-full border-2 p-0 transition-colors duration-150",
          checked
            ? "border-brand bg-brand dark:border-brandVivid dark:bg-brandVivid"
            : "border-inkMuted bg-surfaceTonal"
        )}
      >
        <motion.span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-sm",
            checked ? "bg-white text-[#1A394C]" : "bg-inkSecondary text-surface dark:text-[#0D0D0F]"
          )}
          animate={{ x: checked ? 22 : 2 }}
          whileTap={{ scale: 1.16 }}
          transition={M3_FAST_SPATIAL}
        >
          {checked ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <motion.path
                d="M2.5 7.5L5.5 10.5L11.5 3.5"
                fill="none"
                stroke="#1A394C"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 7H11" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
            </svg>
          )}
        </motion.span>
      </motion.span>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-semibold text-ink">{label}</span>}
          {description && <span className="block text-xs text-inkMuted">{description}</span>}
        </span>
      )}
    </button>
  );
}
