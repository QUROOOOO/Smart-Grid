import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { M3_SPRING_FAST_SPATIAL } from "../lib/motion";

type SliderInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "value" | "min" | "max" | "step"
>;

export interface SliderProps extends SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
  className?: string;
}

const WAVELENGTH = 14;
const AMPLITUDE = 3.2;
const AMPLITUDE_DRAG = 4.2;
const TRACK_H = 36;
const CY = TRACK_H / 2;

/** One 14px cycle: quadratic up, mirrored quadratic down (amplitude = half the control offset). */
function wavePath(amplitude: number) {
  const ctrl = amplitude * 2;
  return `M 0 ${CY} Q ${WAVELENGTH * 0.25} ${CY - ctrl} ${WAVELENGTH * 0.5} ${CY} T ${WAVELENGTH} ${CY}`;
}

export const WavySlider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, value, onChange, min, max, step = 1, unit, showValue = true, className, ...props }, ref) => {
    const rawId = useId();
    const patternId = `wave-${rawId.replace(/:/g, "")}`;
    const [dragging, setDragging] = useState(false);
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    return (
      <div className={cn("w-full", className)}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-inkSecondary">{label}</label>
          {showValue && (
            <span className="num-tabular rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white shadow-pill dark:ring-1 dark:ring-brandRim">
              {value}
              {unit ? <span className="ml-0.5 font-medium opacity-80">{unit}</span> : null}
            </span>
          )}
        </div>

        <div className="relative h-9 select-none">
          {/* inactive straight track + end stop dot */}
          <div
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-surfaceHover"
            style={{ left: `calc(${pct}% + 7px)`, right: 0 }}
          />
          <div className="absolute right-0 top-1/2 h-[4px] w-[4px] -translate-y-1/2 translate-x-[2px] rounded-full bg-inkMuted/50" />

          {/* active wavy track — 14px wavelength, 4px bold stroke */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full text-brand dark:text-brandVivid"
            aria-hidden="true"
            style={{ clipPath: `inset(0 calc(100% - ${pct}% + 7px) 0 0)` }}
          >
            <defs>
              <pattern id={patternId} patternUnits="userSpaceOnUse" width={WAVELENGTH} height={TRACK_H}>
                <path
                  d={wavePath(dragging ? AMPLITUDE_DRAG : AMPLITUDE)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              </pattern>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>

          {/* vertical pill thumb */}
          <motion.div
            className="pointer-events-none absolute top-1/2 h-7 w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-pill ring-2 ring-surface dark:bg-brandVivid"
            style={{ left: `${pct}%` }}
            animate={{ scaleY: dragging ? 1.18 : 1, scaleX: dragging ? 1.2 : 1 }}
            transition={M3_SPRING_FAST_SPATIAL}
          />

          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => setDragging(false)}
            onPointerLeave={() => setDragging(false)}
            aria-label={label}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
            {...props}
          />
        </div>

        <div className="num-tabular mt-0.5 flex justify-between text-[11px] font-medium text-inkMuted">
          <span>
            {min}
            {unit || ""}
          </span>
          <span>
            {max}
            {unit || ""}
          </span>
        </div>
      </div>
    );
  }
);

WavySlider.displayName = "WavySlider";
