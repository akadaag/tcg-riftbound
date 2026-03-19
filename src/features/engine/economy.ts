/**
 * Economy Engine — pricing, XP, traffic calculations.
 *
 * All functions are pure — no side effects, no store access.
 * @module features/engine/economy
 */

import type { CustomerType, GameEvent, SetHype, ShelfSlot } from "@/types/game";
import { XP_THRESHOLDS, MAX_SHOP_LEVEL } from "@/types/game";

// ── Pricing ──────────────────────────────────────────────────────────

/**
 * Calculate the sell price of a product on a shelf.
 * sellPrice = baseSellPrice * (1 + markup / 100) * hypeMultiplier
 */
export function calculateSellPrice(
  baseSellPrice: number,
  markup: number,
  hypeMultiplier: number = 1.0,
): number {
  return Math.round(baseSellPrice * (1 + markup / 100) * hypeMultiplier);
}

/**
 * Will a customer buy at this price?
 * Compares effective price against their budget and price tolerance.
 *
 * priceTolerance 0 = only buys at base price
 * priceTolerance 1 = will pay any markup
 *
 * @param toleranceBonus — additive bonus from upgrades (e.g. 0.1 = +10% tolerance)
 */
export function willCustomerBuy(
  sellPrice: number,
  baseSellPrice: number,
  customerBudget: number,
  priceTolerance: number,
  toleranceBonus: number = 0,
): boolean {
  // Can't afford it at all
  if (sellPrice > customerBudget) return false;

  // Price ratio: how much above base
  const priceRatio = sellPrice / baseSellPrice;
  // Max ratio the customer will accept: base price * (1 + tolerance * 1.5)
  // tolerance 0 → max 1.0x (only base), tolerance 0.5 → max 1.75x, tolerance 1.0 → max 2.5x
  const effectiveTolerance = priceTolerance + toleranceBonus;
  const maxAcceptableRatio = 1 + effectiveTolerance * 1.5;

  return priceRatio <= maxAcceptableRatio;
}

// ── Traffic ──────────────────────────────────────────────────────────

/** Base customers per day by shop level. */
const BASE_TRAFFIC_BY_LEVEL: Record<number, number> = {
  1: 5,
  2: 7,
  3: 10,
  4: 13,
  5: 16,
  6: 20,
  7: 24,
  8: 28,
  9: 32,
  10: 38,
  11: 42,
  12: 46,
  13: 50,
  14: 55,
  15: 60,
  16: 66,
  17: 72,
  18: 78,
  19: 85,
  20: 95,
};

/**
 * Calculate daily customer traffic.
 * Base traffic from shop level, modified by reputation, events, hype,
 * upgrade bonuses, and display case bonus.
 *
 * @param upgradeTrafficBonus — additive multiplier from upgrades (e.g. 0.3 = +30%)
 * @param displayCaseBonus — additive flat bonus from display case (reputation-like)
 */
export function calculateDailyTraffic(
  shopLevel: number,
  reputation: number,
  activeEvents: GameEvent[],
  averageHype: number,
  upgradeTrafficBonus: number = 0,
  displayCaseBonus: number = 0,
): number {
  const base = BASE_TRAFFIC_BY_LEVEL[shopLevel] ?? 5;

  // Reputation bonus: +1 customer per 10 reputation, soft-capped
  const reputationBonus = Math.floor(Math.sqrt(reputation) * 0.5);

  // Event traffic multiplier (multiply all event multipliers together)
  const eventMultiplier = activeEvents.reduce(
    (acc, e) => acc * e.trafficMultiplier,
    1.0,
  );

  // Hype gives a 0.8x to 1.3x multiplier (50 hype = 1.0x baseline)
  const hypeMultiplier = 0.8 + (averageHype / 100) * 0.5;

  const total =
    (base + reputationBonus + displayCaseBonus) *
    eventMultiplier *
    hypeMultiplier *
    (1 + upgradeTrafficBonus);

  // Add some randomness: ±20%
  const variance = 0.8 + Math.random() * 0.4;

  return Math.max(1, Math.round(total * variance));
}

// ── Customer type distribution by shop level ─────────────────────────

type CustomerWeights = Record<CustomerType, number>;

const CUSTOMER_WEIGHTS_BY_LEVEL: Record<number, CustomerWeights> = {
  1: { casual: 60, collector: 5, competitive: 0, kid: 35, whale: 0 },
  2: { casual: 55, collector: 8, competitive: 0, kid: 35, whale: 0 },
  3: { casual: 45, collector: 15, competitive: 5, kid: 30, whale: 0 },
  5: { casual: 40, collector: 18, competitive: 12, kid: 25, whale: 0 },
  7: { casual: 35, collector: 20, competitive: 15, kid: 22, whale: 3 },
  10: { casual: 30, collector: 22, competitive: 18, kid: 18, whale: 7 },
  15: { casual: 25, collector: 23, competitive: 22, kid: 15, whale: 10 },
  20: { casual: 20, collector: 25, competitive: 25, kid: 12, whale: 13 },
};

/**
 * Get customer type weights for a given shop level.
 * Interpolates between defined breakpoints.
 */
export function getCustomerWeights(shopLevel: number): CustomerWeights {
  const breakpoints = Object.keys(CUSTOMER_WEIGHTS_BY_LEVEL)
    .map(Number)
    .sort((a, b) => a - b);

  // Find surrounding breakpoints
  let lower = breakpoints[0];
  let upper = breakpoints[breakpoints.length - 1];

  for (let i = 0; i < breakpoints.length - 1; i++) {
    if (shopLevel >= breakpoints[i] && shopLevel <= breakpoints[i + 1]) {
      lower = breakpoints[i];
      upper = breakpoints[i + 1];
      break;
    }
  }

  if (shopLevel <= lower) return CUSTOMER_WEIGHTS_BY_LEVEL[lower];
  if (shopLevel >= upper) return CUSTOMER_WEIGHTS_BY_LEVEL[upper];

  // Lerp between breakpoints
  const t = (shopLevel - lower) / (upper - lower);
  const lw = CUSTOMER_WEIGHTS_BY_LEVEL[lower];
  const uw = CUSTOMER_WEIGHTS_BY_LEVEL[upper];

  const types: CustomerType[] = [
    "casual",
    "collector",
    "competitive",
    "kid",
    "whale",
  ];

  const result = {} as CustomerWeights;
  for (const ct of types) {
    result[ct] = Math.round(lw[ct] + (uw[ct] - lw[ct]) * t);
  }

  return result;
}

/**
 * Pick a random customer type using weighted distribution.
 */
export function pickCustomerType(
  weights: CustomerWeights,
  eventBonuses: Partial<Record<CustomerType, number>> = {},
): CustomerType {
  const types: CustomerType[] = [
    "casual",
    "collector",
    "competitive",
    "kid",
    "whale",
  ];

  const effectiveWeights = types.map((t) => {
    const base = weights[t] ?? 0;
    const bonus = eventBonuses[t] ?? 0;
    return Math.max(0, base + bonus);
  });

  const total = effectiveWeights.reduce((a, b) => a + b, 0);
  if (total === 0) return "casual"; // fallback

  let roll = Math.random() * total;
  for (let i = 0; i < types.length; i++) {
    roll -= effectiveWeights[i];
    if (roll <= 0) return types[i];
  }

  return types[types.length - 1];
}

// ── XP ───────────────────────────────────────────────────────────────

/** XP sources and their base values. */
export const XP_VALUES = {
  /** Per customer sale. */
  sale: 5,
  /** Per pack opened. */
  packOpened: 3,
  /** Per new unique card discovered. */
  newCard: 2,
  /** Completing a day (end-of-day). */
  dayComplete: 15,
  /** Bonus per 100 revenue earned in a day. */
  revenuePer100: 2,
} as const;

/**
 * Calculate XP earned for a day's activity.
 *
 * @param upgradeXpBonus — additive multiplier from upgrades (e.g. 0.45 = +45%)
 */
export function calculateDayXP(
  customersPurchased: number,
  packsOpened: number,
  newCardsDiscovered: number,
  revenue: number,
  xpMultiplier: number = 1.0,
  upgradeXpBonus: number = 0,
): number {
  const raw =
    customersPurchased * XP_VALUES.sale +
    packsOpened * XP_VALUES.packOpened +
    newCardsDiscovered * XP_VALUES.newCard +
    XP_VALUES.dayComplete +
    Math.floor(revenue / 100) * XP_VALUES.revenuePer100;

  return Math.round(raw * xpMultiplier * (1 + upgradeXpBonus));
}

/**
 * Apply XP to current level/xp state.
 * Returns new xp, level, and xpToNextLevel. Handles multi-level-ups.
 */
export function applyXP(
  currentXP: number,
  currentLevel: number,
  xpToNextLevel: number,
  earnedXP: number,
): { xp: number; level: number; xpToNextLevel: number; levelsGained: number } {
  let xp = currentXP + earnedXP;
  let level = currentLevel;
  let levelsGained = 0;

  // Level up loop
  while (level < MAX_SHOP_LEVEL && xp >= xpToNextLevel) {
    xp -= xpToNextLevel;
    level++;
    levelsGained++;
    xpToNextLevel =
      level < MAX_SHOP_LEVEL ? XP_THRESHOLDS[level + 1] : Infinity;
  }

  // Cap at max level
  if (level >= MAX_SHOP_LEVEL) {
    xp = 0;
    xpToNextLevel = 0;
  }

  return { xp, level, xpToNextLevel, levelsGained };
}

// ── Shelf helpers ────────────────────────────────────────────────────

/**
 * Count total stocked items across all shelves.
 */
export function countStockedItems(shelves: ShelfSlot[]): number {
  return shelves.reduce((acc, s) => acc + s.quantity, 0);
}

/**
 * Count non-empty shelves.
 */
export function countActiveShelfSlots(shelves: ShelfSlot[]): number {
  return shelves.filter((s) => s.productId !== null && s.quantity > 0).length;
}

// ── Average hype helper ──────────────────────────────────────────────

/**
 * Calculate weighted average hype across all sets on shelves.
 * If no shelves stocked, returns 50 (neutral).
 */
export function calculateAverageHype(
  shelves: ShelfSlot[],
  setHype: SetHype[],
  productSetMap: Map<string, string>,
): number {
  const hypeBySet = new Map(setHype.map((h) => [h.setCode, h.currentHype]));
  let totalHype = 0;
  let count = 0;

  for (const shelf of shelves) {
    if (!shelf.productId || shelf.quantity === 0) continue;
    const setCode = productSetMap.get(shelf.productId);
    if (setCode) {
      totalHype += hypeBySet.get(setCode) ?? 50;
      count++;
    }
  }

  return count > 0 ? totalHype / count : 50;
}
