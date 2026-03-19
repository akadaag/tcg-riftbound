/**
 * Hype Tracker — per-set hype levels that affect demand and pricing.
 *
 * Hype 0-100 scale:
 *   0-20   = Dead (no one wants it)
 *   20-40  = Low (bargain hunters only)
 *   40-60  = Normal (steady demand)
 *   60-80  = Hot (high demand, tolerates higher prices)
 *   80-100 = Hype (everyone wants it, pays premium)
 *
 * @module features/engine/hype
 */

import type { SetHype, SetDefinition, GameEvent } from "@/types/game";

/**
 * Daily hype decay rate. Hype tends toward baseHype over time.
 * Decay = (currentHype - baseHype) * DECAY_RATE per day.
 */
const DECAY_RATE = 0.03;

/** Minimum hype floor — never drops below this. */
const MIN_HYPE = 5;

/**
 * Initialize hype state for all sets.
 * Called when starting a new game or when sets are missing from save.
 */
export function initializeHype(sets: SetDefinition[]): SetHype[] {
  return sets.map((s) => ({
    setCode: s.setCode,
    // Start at base hype scaled to 0-100
    currentHype: Math.round(s.hypeBase * 50),
    baseHype: Math.round(s.hypeBase * 50),
  }));
}

/**
 * Apply daily hype decay. Hype decays toward baseHype.
 * If hype > base, it decreases. If hype < base (after event boost ends), it slowly recovers.
 */
export function decayHype(setHype: SetHype[]): SetHype[] {
  return setHype.map((h) => {
    const diff = h.currentHype - h.baseHype;
    const decay = diff * DECAY_RATE;
    const newHype = h.currentHype - decay;

    return {
      ...h,
      currentHype: Math.max(MIN_HYPE, Math.round(newHype * 100) / 100),
    };
  });
}

/**
 * Apply event hype boosts.
 * Events with affectedSets boost those sets; events with empty affectedSets boost all.
 */
export function applyEventHype(
  setHype: SetHype[],
  events: GameEvent[],
): SetHype[] {
  let result = [...setHype.map((h) => ({ ...h }))];

  for (const event of events) {
    const boost = getEventHypeBoost(event.type);
    if (boost === 0) continue;

    const affectsAll = event.affectedSets.length === 0;

    result = result.map((h) => {
      if (affectsAll || event.affectedSets.includes(h.setCode)) {
        return {
          ...h,
          currentHype: Math.min(100, h.currentHype + boost),
        };
      }
      return h;
    });
  }

  return result;
}

/**
 * Get hype boost per day for an event type.
 */
function getEventHypeBoost(eventType: string): number {
  switch (eventType) {
    case "new_set_hype":
      return 15;
    case "tournament_weekend":
      return 8;
    case "collector_convention":
      return 10;
    case "holiday_rush":
      return 5;
    case "influencer_visit":
      return 12;
    case "supply_shortage":
      return 3; // Scarcity drives a bit of hype
    default:
      return 0;
  }
}

/**
 * Get the demand/price multiplier from current hype level.
 * Returns a multiplier around 1.0:
 *   hype  0 → 0.5x
 *   hype 50 → 1.0x
 *   hype 100 → 1.5x
 */
export function getHypeMultiplier(currentHype: number): number {
  return 0.5 + (currentHype / 100) * 1.0;
}

/**
 * Get a human-readable label for a hype level.
 */
export function getHypeLabel(currentHype: number): string {
  if (currentHype >= 80) return "Hype";
  if (currentHype >= 60) return "Hot";
  if (currentHype >= 40) return "Normal";
  if (currentHype >= 20) return "Low";
  return "Dead";
}

/**
 * Get a CSS-friendly color class name for hype level.
 */
export function getHypeColor(currentHype: number): string {
  if (currentHype >= 80) return "text-red-400";
  if (currentHype >= 60) return "text-orange-400";
  if (currentHype >= 40) return "text-yellow-400";
  if (currentHype >= 20) return "text-blue-400";
  return "text-gray-500";
}
