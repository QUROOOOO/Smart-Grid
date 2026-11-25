import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

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

const WAVE = (() => {
  const samples = 48;
  const amp = 3.4;
  const cy = 10;
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * 100;
    const y = cy + Math.sin((i / samples) * Math.PI * 6) * amp;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return pts.join(" ");
})();

export const WavySlider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, value, onChange, min, max, step = 1, unit, showValue = true, className, ...props }, ref) => {
    const rawId = useId();
    const clipId = `wave-${rawId.replace(/:/g, "")}`;
    const [dragging, setDragging] = useState(false);
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    return (
      <div className={cn("w-full", className)}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-inkSecondary">{label}</label>
          {showValue && (
            <span className="num-tabular rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white shadow-pill">
              {value}
              {unit ? <span className="ml-0.5 font-medium opacity-80">{unit}</span> : null}
            </span>
          )}
        </div>

        <div className="relative h-9 select-none">
          {/* inactive straight track + end stop dot */}
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-surfaceHover" />
          <div className="absolute right-0 top-1/2 h-[7px] w-[7px] -translate-y-1/2 translate-x-[3px] rounded-full bg-inkMuted/50" />

          {/* active wavy track */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full text-brand"
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={pct} height="20" />
              </clipPath>
            </defs>
            <path
              d={WAVE}
              clipPath={`url(#${clipId})`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* vertical pill thumb */}
          <motion.div
            className="pointer-events-none absolute top-1/2 h-7 w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-pill ring-2 ring-surface"
            style={{ left: `${pct}%` }}
            animate={{ scaleY: dragging ? 1.18 : 1, scaleX: dragging ? 1.2 : 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
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
