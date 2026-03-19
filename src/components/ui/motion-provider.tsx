"use client";

import { LazyMotion, domAnimation } from "framer-motion";

/**
 * Wraps the app in framer-motion's LazyMotion with domAnimation features.
 * By loading only domAnimation (not domMax), we avoid bundling the full
 * animation feature set, reducing the JS bundle by ~16 kB.
 *
 * All motion components inside must use `m.*` instead of `motion.*`.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
