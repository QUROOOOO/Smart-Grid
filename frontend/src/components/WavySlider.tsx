import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { M3_FAST_SPATIAL } from "../lib/motion";

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

/** Official M3E wavelength (36–40dp) and amplitude (3–4dp). */
const WAVELENGTH = 36;
const AMPLITUDE = 3.2;
const AMPLITUDE_DRAG = 4.0;
const TRACK_H = 36;
const CY = TRACK_H / 2;
const THUMB_GAP = 8;
const SAMPLE = 2;

/** Continuous sine sampled every 2px — never a clipped, cramped pattern. */
function buildWave(width: number, amplitude: number, phase: number) {
  if (width <= 0) return `M 0 ${CY}`;
  const points: string[] = [];
  for (let x = 0; x <= width; x += SAMPLE) {
    const y = CY + amplitude * Math.sin(((x / WAVELENGTH) * Math.PI * 2) + phase);
    points.push(`${x} ${y.toFixed(2)}`);
  }
  return `M ${points.join(" L ")}`;
}

export const WavySlider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, value, onChange, min, max, step = 1, unit, showValue = true, className, ...props }, ref) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [trackW, setTrackW] = useState(240);
    const [dragging, setDragging] = useState(false);
    const [phase, setPhase] = useState(0);

    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    useEffect(() => {
      const el = trackRef.current;
      if (!el) return;
      const ro = new ResizeObserver(([entry]) => {
        setTrackW(entry.contentRect.width || 240);
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      if (!dragging) return;
      const id = window.setInterval(() => setPhase((p) => p + 0.28), 45);
      return () => window.clearInterval(id);
    }, [dragging]);

    const thumbX = (pct / 100) * trackW;
    const activeEnd = Math.max(0, thumbX - THUMB_GAP);

    const taper = pct < 8 ? pct / 8 : pct > 96 ? (100 - pct) / 4 : 1;
    const amplitude = (dragging ? AMPLITUDE_DRAG : AMPLITUDE) * Math.max(0, Math.min(1, taper));

    return (
      <div className={cn("w-full", className)}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-inkSecondary">{label}</label>
          {showValue && (
            <motion.span
              key={value}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={M3_FAST_SPATIAL}
              className="num-tabular rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white shadow-pill dark:ring-1 dark:ring-brandVivid"
            >
              {value}
              {unit ? <span className="ml-0.5 font-medium opacity-80">{unit}</span> : null}
            </motion.span>
          )}
        </div>

        <div ref={trackRef} className="relative h-9 select-none">
          {/* straight inactive track + circular stop dot */}
          <div
            className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-surfaceHover dark:bg-[#2A2A30]"
            style={{ left: Math.min(trackW, thumbX + THUMB_GAP), right: 6 }}
          />
          <div className="absolute right-0 top-1/2 h-[4px] w-[4px] -translate-y-1/2 rounded-full bg-brand/60 dark:bg-brandVivid/70" />

          {/* continuous sine wave */}
          <svg className="pointer-events-none absolute inset-0" width={trackW} height={TRACK_H} aria-hidden="true">
            <path
              d={buildWave(activeEnd, amplitude, phase)}
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              strokeLinecap="round"
              className="text-brand dark:text-brandVivid"
            />
          </svg>

          {/* vertical pill thumb */}
          <motion.div
            className="pointer-events-none absolute top-1/2 h-[30px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-pill dark:bg-brandVivid"
            style={{ left: thumbX }}
            animate={{ scaleY: dragging ? 1.12 : 1 }}
            transition={M3_FAST_SPATIAL}
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
