import { useEffect } from "react";
import { motion, useSpring, useTransform } from "motion/react";

export interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
}

const defaultFormat = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

export function AnimatedNumber({ value, format = defaultFormat, className }: AnimatedNumberProps) {
  const spring = useSpring(value, { stiffness: 190, damping: 26, mass: 1 });
  const display = useTransform(spring, (latest) => format(latest));

  useEffect(() => {
    spring.set(Number.isFinite(value) ? value : 0);
  }, [value, spring]);

  return (
    <motion.span className={className} aria-label={format(Number.isFinite(value) ? value : 0)}>
      {display}
    </motion.span>
  );
}
