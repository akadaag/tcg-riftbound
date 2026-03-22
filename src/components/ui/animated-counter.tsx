"use client";

/**
 * AnimatedCounter — smoothly animates between numeric values.
 *
 * Uses requestAnimationFrame for fluid interpolation. Duration scales
 * with the delta (small change = fast, big = slower) capped at 800ms.
 *
 * @module components/ui/animated-counter
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface AnimatedCounterProps {
  /** The target numeric value to animate toward. */
  value: number;
  /** Optional CSS class for the rendered <span>. */
  className?: string;
  /** Format the number for display. Defaults to toLocaleString(). */
  format?: (n: number) => string;
  /** Suffix appended after the formatted number (e.g. " G"). */
  suffix?: string;
  /** Prefix prepended before the formatted number (e.g. "+"). */
  prefix?: string;
  /** Minimum animation duration in ms. Default 150. */
  minDuration?: number;
  /** Maximum animation duration in ms. Default 800. */
  maxDuration?: number;
  /** Whether to show a flash effect on change. Default true. */
  flash?: boolean;
}

/**
 * Calculate animation duration based on the size of the change.
 * Small changes are fast, large changes are slower.
 */
function calcDuration(delta: number, min: number, max: number): number {
  if (delta === 0) return 0;
  const absDelta = Math.abs(delta);
  // Scale: 1-10 -> min, 10000+ -> max, logarithmic in between
  const t = Math.min(1, Math.log10(Math.max(1, absDelta)) / 4);
  return Math.round(min + t * (max - min));
}

export function AnimatedCounter({
  value,
  className = "",
  format,
  suffix = "",
  prefix = "",
  minDuration = 150,
  maxDuration = 800,
  flash = true,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flashDirection, setFlashDirection] = useState<"up" | "down" | null>(
    null,
  );
  const prevValueRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatFn = useCallback(
    (n: number) => (format ? format(n) : Math.round(n).toLocaleString()),
    [format],
  );

  useEffect(() => {
    const prev = prevValueRef.current;
    const delta = value - prev;
    prevValueRef.current = value;

    if (delta === 0) return;

    // Trigger flash effect
    if (flash) {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      setFlashDirection(delta > 0 ? "up" : "down");
      flashTimeoutRef.current = setTimeout(() => {
        setFlashDirection(null);
      }, 400);
    }

    const duration = calcDuration(delta, minDuration, maxDuration);
    const startTime = performance.now();
    const startValue = prev;

    // Cancel any running animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + delta * eased;

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, minDuration, maxDuration, flash]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const flashClass =
    flashDirection === "up"
      ? "stat-flash-up"
      : flashDirection === "down"
        ? "stat-flash-down"
        : "";

  return (
    <span className={`${className} ${flashClass}`}>
      {prefix}
      {formatFn(displayValue)}
      {suffix}
    </span>
  );
}
