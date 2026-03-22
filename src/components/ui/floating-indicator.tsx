"use client";

/**
 * FloatingIndicator — shows "+N G" labels floating upward on sales.
 *
 * Listens to the notification array in the game store, rendering a
 * short-lived CSS-animated indicator for each new `sale` notification.
 * Max concurrent floaters is capped to avoid visual clutter.
 *
 * @module components/ui/floating-indicator
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { ShopNotification } from "@/types/game";

interface Floater {
  id: string;
  text: string;
  /** Horizontal offset (0-100%) for variety */
  xOffset: number;
  /** Timestamp for cleanup */
  createdAt: number;
}

const MAX_FLOATERS = 5;
const FLOATER_LIFETIME_MS = 1500;

/**
 * Extract a short label from a sale notification message.
 * Tries to pull the gold amount, falls back to a truncated message.
 */
function extractSaleLabel(message: string): string {
  // Look for patterns like "25 G" or "1,234 G"
  const goldMatch = message.match(/([\d,]+)\s*G/);
  if (goldMatch) return `+${goldMatch[1]} G`;
  // Fallback: first 20 chars
  return message.slice(0, 20);
}

interface FloatingIndicatorProps {
  /** Current notifications array from the store */
  notifications: ShopNotification[];
}

export function FloatingIndicator({ notifications }: FloatingIndicatorProps) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCleanup = useCallback(() => {
    if (cleanupTimerRef.current) return;
    cleanupTimerRef.current = setTimeout(() => {
      cleanupTimerRef.current = null;
      const now = Date.now();
      setFloaters((prev) => {
        const next = prev.filter(
          (f) => now - f.createdAt < FLOATER_LIFETIME_MS,
        );
        if (next.length > 0) scheduleCleanup();
        return next;
      });
    }, FLOATER_LIFETIME_MS);
  }, []);

  useEffect(() => {
    if (notifications.length === 0) return;

    const newSales = notifications.filter(
      (n) => n.type === "sale" && !seenIdsRef.current.has(n.id),
    );

    if (newSales.length === 0) return;

    const now = Date.now();
    const newFloaters: Floater[] = newSales.map((n) => {
      seenIdsRef.current.add(n.id);
      return {
        id: n.id,
        text: extractSaleLabel(n.message),
        xOffset: 20 + Math.random() * 60, // 20-80% range
        createdAt: now,
      };
    });

    setFloaters((prev) => {
      const combined = [...prev, ...newFloaters];
      // Cap to max
      return combined.slice(-MAX_FLOATERS);
    });

    scheduleCleanup();

    // Keep seenIds from growing unbounded
    if (seenIdsRef.current.size > 200) {
      const ids = Array.from(seenIdsRef.current);
      seenIdsRef.current = new Set(ids.slice(-100));
    }
  }, [notifications, scheduleCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
    };
  }, []);

  if (floaters.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {floaters.map((f) => (
        <span
          key={f.id}
          className="floating-indicator text-currency-gold absolute text-sm font-bold drop-shadow-md"
          style={{
            left: `${f.xOffset}%`,
            bottom: "10%",
          }}
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}
