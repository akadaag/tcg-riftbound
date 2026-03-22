/**
 * Shared framer-motion animation variants for Riftbound Shop.
 * Import these instead of defining inline variants per component.
 */
import type { Variants, Transition } from "framer-motion";

// ── Timing constants ──────────────────────────────────

export const DURATIONS = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  reveal: 0.6,
} as const;

export const SPRING_BOUNCE: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};

export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
};

// ── Page / Route transitions ──────────────────────────

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATIONS.normal } },
  exit: { opacity: 0, transition: { duration: DURATIONS.fast } },
};

export const fadeSlideUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.normal, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: DURATIONS.fast },
  },
};

// ── Modal / Overlay ───────────────────────────────────

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATIONS.fast } },
  exit: { opacity: 0, transition: { duration: DURATIONS.fast } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...SPRING_BOUNCE, duration: DURATIONS.normal },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: DURATIONS.fast },
  },
};

// ── Card reveal (pack opening) ────────────────────────

/**
 * Applied to the flip *container* (preserve-3d).
 * Container starts at rotateY:0 (back face visible) and flips to rotateY:180
 * (front face becomes visible). Both faces must have backface-hidden.
 * Back face: no CSS rotation. Front face: rotate-y-180 in CSS.
 */
export const cardFlip: Variants = {
  hidden: { rotateY: 0 },
  visible: {
    rotateY: 180,
    transition: { duration: DURATIONS.reveal, ease: "easeOut" },
  },
};

export const cardSlideIn: Variants = {
  hidden: { opacity: 0, x: 40, scale: 0.9 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { ...SPRING_GENTLE },
  },
};

export const packShake: Variants = {
  idle: { rotate: 0, scale: 1 },
  shaking: {
    rotate: [0, -3, 3, -2, 2, 0],
    scale: [1, 1.02, 1.02, 1.01, 1.01, 1],
    transition: { duration: 0.5, ease: "easeInOut" },
  },
  burst: {
    scale: [1, 1.15, 0],
    opacity: [1, 1, 0],
    transition: { duration: 0.4, ease: "easeIn" },
  },
};

// ── List items (stagger children) ─────────────────────

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.normal, ease: "easeOut" },
  },
};

// ── Toast ─────────────────────────────────────────────

export const toastVariants: Variants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...SPRING_BOUNCE },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: DURATIONS.fast },
  },
};

// ── Level-up celebration ──────────────────────────────

export const levelUpPulse: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: [0.5, 1.15, 1],
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

// ── Micro-interactions ────────────────────────────────

export const tapScale = {
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 17 },
};

export const hoverGlow = {
  whileHover: { scale: 1.02 },
  transition: { type: "spring", stiffness: 300, damping: 20 },
};

// ── Phase 2: Pack Opening Revamp ──────────────────────

/** Full-screen card flip — larger, slower for dramatic effect */
export const revealCardFlip: Variants = {
  hidden: { rotateY: 0, scale: 0.92 },
  visible: {
    rotateY: 180,
    scale: 1,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** Faster flip for batch mode */
export const revealCardFlipFast: Variants = {
  hidden: { rotateY: 0, scale: 0.95 },
  visible: {
    rotateY: 180,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** Card details slide in below the card after flip */
export const cardDetailsSlide: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: 0.45, ease: "easeOut" },
  },
};

/** Card details slide in faster for batch mode */
export const cardDetailsSlideFast: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, delay: 0.3, ease: "easeOut" },
  },
};

/** NEW badge bounce-in with sparkle feel */
export const newBadgeBounce: Variants = {
  hidden: { opacity: 0, scale: 0, rotate: -15 },
  visible: {
    opacity: 1,
    scale: [0, 1.3, 0.9, 1.05, 1],
    rotate: [-15, 5, -3, 0],
    transition: { duration: 0.5, delay: 0.55, ease: "easeOut" },
  },
};

/** Summary grid stagger — slightly slower for pack summary */
export const summaryStaggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.15,
    },
  },
};

export const summaryStaggerItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

/** Counter pill at top of reveal screen */
export const counterPillVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};
