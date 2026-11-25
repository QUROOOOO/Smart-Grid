import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { M3_SPRING_DEFAULT_SPATIAL } from "../lib/motion";

const LOBES = 8;
const CENTER = 50;
const RADIUS = 38;

function scallopPath() {
  const pts = Array.from({ length: LOBES }, (_, i) => {
    const angle = (i / LOBES) * Math.PI * 2 - Math.PI / 2;
    return { x: CENTER + Math.cos(angle) * RADIUS, y: CENTER + Math.sin(angle) * RADIUS, angle };
  });

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < LOBES; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % LOBES];
    const midAngle = a.angle + Math.PI / LOBES;
    const bulge = RADIUS * 1.26;
    const cx = CENTER + Math.cos(midAngle) * bulge;
    const cy = CENTER + Math.sin(midAngle) * bulge;
    d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  return `${d} Z`;
}

const SCALLOP = scallopPath();

export interface GridPulseMarkProps {
  size?: number;
  className?: string;
}

export function GridPulseMark({ size = 36, className }: GridPulseMarkProps) {
  return (
    <motion.div
      className={cn("grid place-items-center text-brand dark:text-brandVivid", className)}
      style={{ width: size, height: size }}
      whileHover={{ rotate: 15 }}
      whileTap={{ scale: 0.94 }}
      transition={M3_SPRING_DEFAULT_SPATIAL}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <path d={SCALLOP} fill="currentColor" />
        <path
          d="M 27 52 L 38 52 L 44 38 L 53 64 L 59 52 L 73 52"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={5.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}
