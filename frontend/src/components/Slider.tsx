import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";

type SliderInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value" | "min" | "max" | "step">;

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

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, value, onChange, min, max, step = 1, unit, showValue = true, className, ...props }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn("w-full", className)}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-primaryInk">{label}</label>
          {showValue && (
            <span className="num-tabular text-sm font-mono text-gridOrange">
              {value}{unit && <span className="text-mutedInk font-normal ml-1">{unit}</span>}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-hairline rounded-lg appearance-none cursor-pointer accent-gridOrange"
            {...props}
          />
          <div
            className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-gridOrange/30 to-transparent pointer-events-none"
            style={{ transform: "translateY(-50%)" }}
          />
        </div>
        <div className="flex justify-between text-xs text-mutedInk mt-1">
          <span>{min}{unit || ""}</span>
          <span>{max}{unit || ""}</span>
        </div>
      </div>
    );
  }
);

Slider.displayName = "Slider";