import type { Transition, Variants } from "motion/react";

/* ── Official Material 3 Expressive spring physics ───────────────────────────
   damping = 2 * zeta * sqrt(stiffness), mass = 1 (matches Compose/Android 16). */

/** ζ 0.6 · stiffness 800 — switches, button press squish, connected pill morph */
export const M3_FAST_SPATIAL: Transition = {
  type: "spring",
  stiffness: 800,
  damping: 34,
  mass: 1,
};

/** ζ 0.8 · stiffness 380 — floating nav pill, view cards, dropdowns */
export const M3_DEFAULT_SPATIAL: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 31,
  mass: 1,
};

/** ζ 0.8 · stiffness 200 — radial gauges, scalloped seal, progress bars */
export const M3_SLOW_SPATIAL: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 23,
  mass: 1,
};

/** ζ 1.0 · stiffness 3800 — hover fills, icon FILL morph (zero overshoot) */
export const M3_FAST_EFFECTS: Transition = {
  type: "spring",
  stiffness: 3800,
  damping: 123,
  mass: 1,
};

/** ζ 1.0 · stiffness 1600 — opacity, theme polarity transitions */
export const M3_DEFAULT_EFFECTS: Transition = {
  type: "spring",
  stiffness: 1600,
  damping: 80,
  mass: 1,
};

/** Backwards-compatible aliases used across the component library. */
export const M3_SPRING_FAST_SPATIAL = M3_FAST_SPATIAL;
export const M3_SPRING_DEFAULT_SPATIAL = M3_DEFAULT_SPATIAL;
export const M3_SPRING_SLOW_SPATIAL = M3_SLOW_SPATIAL;
export const M3_SPRING_EFFECTS = M3_DEFAULT_EFFECTS;

/** Staggered entrance used by bento grids on tab switch. */
export const M3_STAGGER_STEP = 0.045;

export const M3_PAGE_VARIANTS: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: M3_STAGGER_STEP, delayChildren: 0.02 },
  },
};

export const M3_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: M3_DEFAULT_SPATIAL },
};

export const M3_ENTRANCE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};
