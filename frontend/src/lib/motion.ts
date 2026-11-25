import type { Transition } from "motion/react";

/** Official Material 3 Expressive spring presets. */
export const M3_SPRING_FAST_SPATIAL: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 26,
  mass: 0.8,
};

export const M3_SPRING_DEFAULT_SPATIAL: Transition = {
  type: "spring",
  stiffness: 360,
  damping: 24,
  mass: 0.9,
};

export const M3_SPRING_SLOW_SPATIAL: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 22,
  mass: 1.0,
};

export const M3_SPRING_EFFECTS: Transition = {
  type: "spring",
  stiffness: 450,
  damping: 35,
  mass: 1.0,
};

/** Staggered entrance used by bento grids on tab switch. */
export const M3_STAGGER_STEP = 0.035;

export const M3_ENTRANCE = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};
