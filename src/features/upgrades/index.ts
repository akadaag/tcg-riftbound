/**
 * Upgrades Engine — catalog, cost calculation, effect aggregation.
 *
 * All functions are pure — no side effects, no store access.
 * @module features/upgrades
 */

import type {
  UpgradeDefinition,
  UpgradeState,
  UpgradeCategory,
} from "@/types/game";

// ── Upgrade Catalog ──────────────────────────────────────────────────

const UPGRADE_CATALOG: UpgradeDefinition[] = [
  // --- Shelves ---
  {
    id: "extra_shelf",
    category: "shelves",
    name: "Extra Shelf",
    description: "Add a new shelf slot to display more products.",
    costs: [300, 800, 2000],
    maxLevel: 3,
    effectType: "shelf_slot",
    effectPerLevel: 1,
    minShopLevel: 1,
    icon: "🗄️",
  },

  // --- Traffic ---
  {
    id: "better_signage",
    category: "traffic",
    name: "Better Signage",
    description:
      "Attract more customers with eye-catching signs. +10% traffic per level.",
    costs: [200, 500, 1200, 2500, 5000],
    maxLevel: 5,
    effectType: "traffic_multiplier",
    effectPerLevel: 0.1,
    minShopLevel: 1,
    icon: "🪧",
  },

  // --- Reputation ---
  {
    id: "loyalty_program",
    category: "reputation",
    name: "Loyalty Program",
    description: "Build customer loyalty. +5 reputation per day.",
    costs: [400, 1000, 2500],
    maxLevel: 3,
    effectType: "reputation_per_day",
    effectPerLevel: 5,
    minShopLevel: 2,
    icon: "⭐",
  },

  // --- XP ---
  {
    id: "training_manual",
    category: "xp",
    name: "Training Manual",
    description: "Learn faster from experience. +15% XP per level.",
    costs: [350, 900, 2000],
    maxLevel: 3,
    effectType: "xp_multiplier",
    effectPerLevel: 0.15,
    minShopLevel: 2,
    icon: "📖",
  },

  // --- Wholesale ---
  {
    id: "supplier_contacts",
    category: "wholesale",
    name: "Supplier Contacts",
    description: "Negotiate better wholesale prices. -5% cost per level.",
    costs: [500, 1500, 4000],
    maxLevel: 3,
    effectType: "wholesale_discount",
    effectPerLevel: 0.05,
    minShopLevel: 3,
    icon: "🤝",
  },

  // --- Display Case ---
  {
    id: "display_case_expansion",
    category: "display_case",
    name: "Display Case Expansion",
    description: "Showcase more cards. +2 display slots per level.",
    costs: [250, 700, 1800],
    maxLevel: 3,
    effectType: "display_case_slots",
    effectPerLevel: 2,
    minShopLevel: 3,
    icon: "🏆",
  },

  // --- Tolerance ---
  {
    id: "premium_lighting",
    category: "tolerance",
    name: "Premium Lighting",
    description:
      "Make your shop feel premium. Customers tolerate +5% higher prices.",
    costs: [450, 1200, 3000],
    maxLevel: 3,
    effectType: "tolerance_bonus",
    effectPerLevel: 0.05,
    minShopLevel: 4,
    icon: "💡",
  },

  // --- Storage ---
  {
    id: "stock_room",
    category: "storage",
    name: "Stock Room",
    description: "Expand your back-room storage capacity.",
    costs: [300, 800, 2000, 4500],
    maxLevel: 4,
    effectType: "inventory_capacity",
    effectPerLevel: 50,
    minShopLevel: 2,
    icon: "📦",
  },
];

// ── Accessors ────────────────────────────────────────────────────────

/** Get the full upgrade catalog. */
export function getUpgradeCatalog(): UpgradeDefinition[] {
  return UPGRADE_CATALOG;
}

/** Get a specific upgrade definition by ID. */
export function getUpgradeById(id: string): UpgradeDefinition | undefined {
  return UPGRADE_CATALOG.find((u) => u.id === id);
}

/** Get all upgrades in a specific category. */
export function getUpgradesByCategory(
  category: UpgradeCategory,
): UpgradeDefinition[] {
  return UPGRADE_CATALOG.filter((u) => u.category === category);
}

// ── Cost & Validation ────────────────────────────────────────────────

/**
 * Get the cost for the next level of an upgrade.
 * Returns null if the upgrade is already maxed.
 */
export function getUpgradeCost(
  upgrade: UpgradeDefinition,
  currentLevel: number,
): number | null {
  if (currentLevel >= upgrade.maxLevel) return null;
  return upgrade.costs[currentLevel] ?? upgrade.costs[upgrade.costs.length - 1];
}

/**
 * Check if a player can purchase the next level of an upgrade.
 */
export function canPurchaseUpgrade(
  upgrade: UpgradeDefinition,
  currentLevel: number,
  shopLevel: number,
  currency: number,
): { canBuy: boolean; reason: string | null } {
  if (currentLevel >= upgrade.maxLevel) {
    return { canBuy: false, reason: "Already at max level" };
  }
  if (shopLevel < upgrade.minShopLevel) {
    return {
      canBuy: false,
      reason: `Requires Shop Level ${upgrade.minShopLevel}`,
    };
  }
  const cost = getUpgradeCost(upgrade, currentLevel);
  if (cost === null) {
    return { canBuy: false, reason: "Already at max level" };
  }
  if (currency < cost) {
    return { canBuy: false, reason: `Not enough gold (need ${cost} G)` };
  }
  return { canBuy: true, reason: null };
}

/**
 * Get the current level of an upgrade from the player's upgrade state.
 */
export function getOwnedLevel(
  upgradeId: string,
  upgrades: UpgradeState[],
): number {
  return upgrades.find((u) => u.upgradeId === upgradeId)?.levelOwned ?? 0;
}

// ── Effect Aggregation ───────────────────────────────────────────────

/**
 * Aggregated modifiers from all owned upgrades.
 * Used by engine functions to apply upgrade effects.
 */
export interface UpgradeModifiers {
  /** Additional shelf slots (additive). */
  extraShelves: number;
  /** Traffic multiplier bonus (additive, e.g. 0.3 = +30%). */
  trafficBonus: number;
  /** Reputation gained per day (additive). */
  reputationPerDay: number;
  /** XP multiplier bonus (additive, e.g. 0.45 = +45%). */
  xpBonus: number;
  /** Wholesale price discount (multiplicative, e.g. 0.15 = 15% off → multiply by 0.85). */
  wholesaleDiscount: number;
  /** Additional display case slots (additive). Base is 3. */
  extraDisplaySlots: number;
  /** Price tolerance bonus (additive, applied to customer tolerance). */
  toleranceBonus: number;
  /** Additional inventory capacity (additive). */
  extraInventoryCapacity: number;
}

/**
 * Calculate aggregated modifiers from all owned upgrades.
 */
export function getUpgradeModifiers(
  upgrades: UpgradeState[],
): UpgradeModifiers {
  const mods: UpgradeModifiers = {
    extraShelves: 0,
    trafficBonus: 0,
    reputationPerDay: 0,
    xpBonus: 0,
    wholesaleDiscount: 0,
    extraDisplaySlots: 0,
    toleranceBonus: 0,
    extraInventoryCapacity: 0,
  };

  for (const owned of upgrades) {
    const def = getUpgradeById(owned.upgradeId);
    if (!def || owned.levelOwned <= 0) continue;

    const totalEffect = def.effectPerLevel * owned.levelOwned;

    switch (def.effectType) {
      case "shelf_slot":
        mods.extraShelves += totalEffect;
        break;
      case "traffic_multiplier":
        mods.trafficBonus += totalEffect;
        break;
      case "reputation_per_day":
        mods.reputationPerDay += totalEffect;
        break;
      case "xp_multiplier":
        mods.xpBonus += totalEffect;
        break;
      case "wholesale_discount":
        mods.wholesaleDiscount += totalEffect;
        break;
      case "display_case_slots":
        mods.extraDisplaySlots += totalEffect;
        break;
      case "tolerance_bonus":
        mods.toleranceBonus += totalEffect;
        break;
      case "inventory_capacity":
        mods.extraInventoryCapacity += totalEffect;
        break;
    }
  }

  return mods;
}

/** Base display case slots before upgrades. */
export const BASE_DISPLAY_CASE_SLOTS = 3;

/** Base inventory capacity (pack/product units in the back room). */
export const BASE_INVENTORY_CAPACITY = 200;

/**
 * Get the total inventory capacity (base + stock room upgrade bonus).
 */
export function getTotalInventoryCapacity(upgrades: UpgradeState[]): number {
  const mods = getUpgradeModifiers(upgrades);
  return BASE_INVENTORY_CAPACITY + mods.extraInventoryCapacity;
}

/**
 * Get the total display case capacity (base + upgrade bonus).
 */
export function getDisplayCaseCapacity(upgrades: UpgradeState[]): number {
  const mods = getUpgradeModifiers(upgrades);
  return BASE_DISPLAY_CASE_SLOTS + mods.extraDisplaySlots;
}

// ── Display Case Bonus ───────────────────────────────────────────────

/**
 * Calculate the traffic bonus from the display case.
 *
 * Sums the displayScore of all showcased cards and applies diminishing returns.
 * Returns a flat bonus to customer traffic (additive with reputation bonus).
 *
 * @param displayCaseCardIds — card IDs currently in the display case
 * @param getMetaFn — function to look up gameplay meta by card ID
 * @returns flat traffic bonus (e.g. 3 = +3 customers)
 */
export function calculateDisplayCaseBonus(
  displayCaseCardIds: string[],
  getMetaFn: (cardId: string) => { displayScore: number } | undefined,
): { trafficBonus: number; totalDisplayScore: number } {
  if (displayCaseCardIds.length === 0) {
    return { trafficBonus: 0, totalDisplayScore: 0 };
  }

  let totalDisplayScore = 0;
  for (const cardId of displayCaseCardIds) {
    const meta = getMetaFn(cardId);
    if (meta) {
      totalDisplayScore += meta.displayScore;
    }
  }

  // Diminishing returns: sqrt scaling so first cards matter more
  // 1 card with score 5 → ~1.1 bonus
  // 3 cards with score 5 each (15) → ~1.9 bonus
  // 9 cards with score 10 each (90) → ~4.7 bonus
  const trafficBonus = Math.floor(Math.sqrt(totalDisplayScore) * 0.5);

  return { trafficBonus, totalDisplayScore };
}
