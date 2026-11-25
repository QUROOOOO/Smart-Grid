import { motion } from "motion/react";
import { cn } from "../lib/utils";

export interface ScallopBadgeProps {
  children: React.ReactNode;
  /** Changing this re-triggers the spring pop */
  value?: string | number;
  size?: number;
  variant?: "brand" | "obsidian" | "outline";
  className?: string;
  lobes?: number;
}

function scallopPoints(lobes: number, outer = 50, inner = 43.5) {
  const pts: string[] = [];
  const total = lobes * 2;
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${(50 + Math.cos(angle) * r).toFixed(2)},${(50 + Math.sin(angle) * r).toFixed(2)}`);
  }
  return pts.join(" ");
}

const FILLS = {
  brand: { poly: "rgb(var(--brand))", text: "text-white" },
  obsidian: { poly: "rgb(var(--obsidian))", text: "text-canvas" },
  outline: { poly: "rgb(var(--surface-tonal))", text: "text-ink" },
};

export function ScallopBadge({
  children,
  value,
  size = 176,
  variant = "brand",
  className,
  lobes = 12,
}: ScallopBadgeProps) {
  const fill = FILLS[variant];
  return (
    <motion.div
      key={String(value ?? "static")}
      initial={{ scale: 0.88, rotate: -7 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.9 }}
      style={{ width: size, height: size }}
      className={cn("relative grid flex-shrink-0 place-items-center", className)}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <polygon
          points={scallopPoints(lobes)}
          fill={fill.poly}
          strokeLinejoin="round"
          className="drop-shadow-[0_10px_26px_rgba(26,57,76,0.22)]"
        />
      </svg>
      <div className={cn("relative z-10 flex flex-col items-center justify-center text-center", fill.text)}>
        {children}
      </div>
    </motion.div>
  );
}
