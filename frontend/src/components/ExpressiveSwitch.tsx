import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { M3_SPRING_FAST_SPATIAL } from "../lib/motion";

export interface ExpressiveSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

const TRACK_W = 52;
const TRACK_H = 32;
const BORDER = 2;
const THUMB_OFF = 20;
const THUMB_ON = 24;
const TRAVEL = TRACK_W - BORDER * 2 - THUMB_ON - 4;

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
        whileTap={{ scale: 0.97 }}
        className={cn(
          "relative flex flex-shrink-0 items-center rounded-full border-2 transition-colors duration-200",
          checked
            ? "border-brand bg-brand dark:border-brandRim"
            : "border-inkMuted bg-surfaceTonal"
        )}
        style={{ width: TRACK_W, height: TRACK_H }}
      >
        <motion.span
          whileTap={{ width: 27, height: 27 }}
          animate={{
            width: checked ? THUMB_ON : THUMB_OFF,
            height: checked ? THUMB_ON : THUMB_OFF,
            x: checked ? TRAVEL : 0,
          }}
          transition={M3_SPRING_FAST_SPATIAL}
          className={cn(
            "absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full",
            checked ? "bg-white" : "bg-inkSecondary"
          )}
          style={{ left: BORDER + 1 }}
        >
          {checked ? (
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <motion.path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="#1A394C"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
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
