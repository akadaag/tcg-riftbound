/**
 * Limited Products Engine — weekly rotating limited-edition products.
 *
 * C2: 2-3 "limited edition" products rotate weekly with higher margins
 * but limited stock from supplier. Creates buying urgency.
 *
 * Limited products are virtual wrappers around existing base products with:
 *   - Higher sell price (1.5x-2x markup on base sell price)
 *   - Same buy price (or slightly higher)
 *   - Limited stock per week (3-8 units)
 *
 * Pure functions — no side effects, no React, no store access.
 * @module features/engine/limited-products
 */

import type { SaveGame } from "@/types/game";

// ── Types ──────────────────────────────────────────────────────────

export interface LimitedProduct {
  /** Unique ID for this limited product instance (e.g. "limited-prod-ogn-booster-w5"). */
  id: string;
  /** The base product ID this wraps (e.g. "prod-ogn-booster"). */
  baseProductId: string;
  /** Display name with "Limited" prefix. */
  name: string;
  /** Set code from the base product. */
  setCode: string;
  /** Buy price from supplier (slightly higher than base). */
  buyPrice: number;
  /** Sell price base (significantly higher than base — the premium). */
  sellPriceBase: number;
  /** Cards per unit (same as base). */
  cardsPerUnit: number;
  /** Total stock available this week. */
  totalStock: number;
  /** Remaining stock this week. */
  remainingStock: number;
  /** Flavour text for why it's limited. */
  flavourText: string;
}

export interface LimitedProductRotation {
  /** Week number (day / 7, floored) when this rotation was generated. */
  weekGenerated: number;
  /** The limited products available this week. */
  products: LimitedProduct[];
}

// ── Constants ──────────────────────────────────────────────────────

/** Minimum shop level to unlock limited products. */
export const LIMITED_PRODUCTS_UNLOCK_LEVEL = 5;

/** Days per week in game time (for rotation tracking). */
const DAYS_PER_WEEK = 7;

/** Base product pool that can become limited editions. */
const LIMITED_PRODUCT_POOL: Array<{
  baseProductId: string;
  baseName: string;
  setCode: string;
  baseBuyPrice: number;
  baseSellPrice: number;
  cardsPerUnit: number;
}> = [
  {
    baseProductId: "prod-ogn-booster",
    baseName: "Origins Booster Pack",
    setCode: "OGN",
    baseBuyPrice: 120,
    baseSellPrice: 150,
    cardsPerUnit: 14,
  },
  {
    baseProductId: "prod-sfd-booster",
    baseName: "Spiritforged Booster Pack",
    setCode: "SFD",
    baseBuyPrice: 130,
    baseSellPrice: 160,
    cardsPerUnit: 14,
  },
  {
    baseProductId: "prod-ogs-starter",
    baseName: "Proving Grounds Starter Box",
    setCode: "OGS",
    baseBuyPrice: 80,
    baseSellPrice: 100,
    cardsPerUnit: 24,
  },
  {
    baseProductId: "prod-ogn-box",
    baseName: "Origins Booster Box",
    setCode: "OGN",
    baseBuyPrice: 2500,
    baseSellPrice: 3200,
    cardsPerUnit: 336,
  },
  {
    baseProductId: "prod-sfd-box",
    baseName: "Spiritforged Booster Box",
    setCode: "SFD",
    baseBuyPrice: 2700,
    baseSellPrice: 3500,
    cardsPerUnit: 336,
  },
];

/** Flavour texts for limited products (rotated through). */
const FLAVOUR_TEXTS = [
  "Exclusive distributor allocation — limited run!",
  "Tournament-grade sealed product. While supplies last.",
  "Collector's release — only a few available this week.",
  "Special import from overseas supplier. Don't miss out!",
  "Premium print run with enhanced foiling. Very limited.",
];

// ── Seeded RNG ─────────────────────────────────────────────────────

/**
 * Simple seeded PRNG (mulberry32). Deterministic per week number
 * so every player sees the same rotation for a given week.
 */
function seededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Functions ──────────────────────────────────────────────────────

/**
 * Get the current game week number from the day.
 */
export function getWeekNumber(currentDay: number): number {
  return Math.floor((currentDay - 1) / DAYS_PER_WEEK);
}

/**
 * Generate the weekly limited product rotation.
 * Deterministic based on week number (seeded RNG).
 *
 * Picks 2-3 products from the pool with:
 *   - Buy price: 1.1x-1.3x base
 *   - Sell price: 1.5x-2.0x base (the premium margin)
 *   - Stock: 3-8 units for packs, 1-2 for boxes
 *
 * @param weekNumber — current week number (from getWeekNumber)
 * @param shopLevel — player's shop level (affects stock amounts)
 */
export function generateLimitedRotation(
  weekNumber: number,
  shopLevel: number,
): LimitedProductRotation {
  const rng = seededRandom(weekNumber * 7919 + 1337);

  // Pick 2-3 products
  const count = rng() < 0.4 ? 3 : 2;

  // Shuffle pool using Fisher-Yates with seeded RNG
  const pool = [...LIMITED_PRODUCT_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const selected = pool.slice(0, count);

  const products: LimitedProduct[] = selected.map((base, idx) => {
    const isBox = base.baseProductId.includes("box");

    // Buy price: 10-30% premium
    const buyMultiplier = 1.1 + rng() * 0.2;
    const buyPrice = Math.round(base.baseBuyPrice * buyMultiplier);

    // Sell price: 50-100% premium (the high-margin appeal)
    const sellMultiplier = 1.5 + rng() * 0.5;
    const sellPriceBase = Math.round(base.baseSellPrice * sellMultiplier);

    // Stock: boxes get 1-2, packs/starters get 3-8 (scales slightly with level)
    const levelBonus = Math.floor(shopLevel / 10);
    const stock = isBox
      ? 1 + (rng() < 0.3 ? 1 : 0)
      : 3 + Math.floor(rng() * 4) + levelBonus;

    const flavour = FLAVOUR_TEXTS[(weekNumber + idx) % FLAVOUR_TEXTS.length];

    return {
      id: `limited-${base.baseProductId}-w${weekNumber}`,
      baseProductId: base.baseProductId,
      name: `Limited: ${base.baseName}`,
      setCode: base.setCode,
      buyPrice,
      sellPriceBase,
      cardsPerUnit: base.cardsPerUnit,
      totalStock: stock,
      remainingStock: stock,
      flavourText: flavour,
    };
  });

  return {
    weekGenerated: weekNumber,
    products,
  };
}

/**
 * Check if the limited product rotation needs refreshing.
 * Returns true if the current rotation is stale (wrong week).
 */
export function shouldRefreshRotation(
  currentDay: number,
  rotation: SaveGame["limitedProductRotation"],
): boolean {
  if (!rotation) return true;
  const currentWeek = getWeekNumber(currentDay);
  return rotation.weekGenerated !== currentWeek;
}

/**
 * Build the SaveGame-compatible rotation state from our internal rotation.
 * Maps to the SaveGame.limitedProductRotation shape.
 */
export function rotationToSaveState(
  rotation: LimitedProductRotation,
): NonNullable<SaveGame["limitedProductRotation"]> {
  const remainingStock: Record<string, number> = {};
  for (const p of rotation.products) {
    remainingStock[p.id] = p.remainingStock;
  }
  return {
    weekGenerated: rotation.weekGenerated,
    productIds: rotation.products.map((p) => p.id),
    remainingStock,
  };
}

/**
 * Restore a full LimitedProductRotation from saved state.
 * Re-generates the rotation for the saved week and applies saved stock levels.
 */
export function restoreRotationFromSave(
  saveState: NonNullable<SaveGame["limitedProductRotation"]>,
  shopLevel: number,
): LimitedProductRotation {
  const rotation = generateLimitedRotation(saveState.weekGenerated, shopLevel);
  // Apply saved remaining stock
  for (const p of rotation.products) {
    if (p.id in saveState.remainingStock) {
      p.remainingStock = saveState.remainingStock[p.id];
    }
  }
  return rotation;
}

/**
 * Purchase a limited product. Returns updated rotation or null if purchase fails.
 *
 * @param rotation — current rotation
 * @param limitedProductId — the limited product ID to purchase
 * @param quantity — how many to buy (usually 1)
 */
export function purchaseLimitedProduct(
  rotation: LimitedProductRotation,
  limitedProductId: string,
  quantity: number = 1,
): { updatedRotation: LimitedProductRotation; product: LimitedProduct } | null {
  const product = rotation.products.find((p) => p.id === limitedProductId);
  if (!product) return null;
  if (product.remainingStock < quantity) return null;

  const updatedProducts = rotation.products.map((p) =>
    p.id === limitedProductId
      ? { ...p, remainingStock: p.remainingStock - quantity }
      : p,
  );

  return {
    updatedRotation: { ...rotation, products: updatedProducts },
    product: { ...product },
  };
}
