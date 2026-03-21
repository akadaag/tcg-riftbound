/**
 * Upgrades Engine — catalog, cost calculation, prerequisite validation, effect aggregation.
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
//
// 3 categories, ~20 upgrades with prerequisite chains.
// All 8 original upgrade IDs are preserved for backward compatibility.

const UPGRADE_CATALOG: UpgradeDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════
  //  OPERATIONS — shelves, storage, wholesale, inventory management
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "extra_shelf",
    category: "operations",
    name: "Extra Shelf",
    description: "Add a new shelf slot to display more products.",
    costs: [300, 800, 2000],
    maxLevel: 3,
    effectType: "shelf_slot",
    effectPerLevel: 1,
    minShopLevel: 1,
    icon: "🗄️",
  },
  {
    id: "stock_room",
    category: "operations",
    name: "Stock Room",
    description: "Expand your back-room storage capacity. +50 per level.",
    costs: [300, 800, 2000, 4500],
    maxLevel: 4,
    effectType: "inventory_capacity",
    effectPerLevel: 50,
    minShopLevel: 2,
    icon: "📦",
  },
  {
    id: "supplier_contacts",
    category: "operations",
    name: "Supplier Contacts",
    description: "Negotiate better wholesale prices. -5% cost per level.",
    costs: [500, 1500, 4000],
    maxLevel: 3,
    effectType: "wholesale_discount",
    effectPerLevel: 0.05,
    minShopLevel: 3,
    icon: "🤝",
  },
  {
    id: "bulk_ordering",
    category: "operations",
    name: "Bulk Ordering",
    description:
      "Deeper supplier relationships unlock even better rates. -5% cost per level.",
    costs: [3000, 6000],
    maxLevel: 2,
    effectType: "wholesale_discount",
    effectPerLevel: 0.05,
    minShopLevel: 5,
    icon: "🚚",
    prerequisites: ["supplier_contacts"],
  },
  {
    id: "warehouse_expansion",
    category: "operations",
    name: "Warehouse Expansion",
    description: "Serious storage for serious volume. +100 capacity per level.",
    costs: [3500, 7000],
    maxLevel: 2,
    effectType: "inventory_capacity",
    effectPerLevel: 100,
    minShopLevel: 5,
    icon: "🏗️",
    prerequisites: ["stock_room"],
  },
  {
    id: "efficient_shelving",
    category: "operations",
    name: "Efficient Shelving",
    description: "Better shelf organization. +1 shelf slot per level.",
    costs: [4000, 8000],
    maxLevel: 2,
    effectType: "shelf_slot",
    effectPerLevel: 1,
    minShopLevel: 6,
    icon: "📐",
    prerequisites: ["extra_shelf"],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  CUSTOMER EXPERIENCE — traffic, display case, tolerance, reputation
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "better_signage",
    category: "customer_experience",
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
  {
    id: "loyalty_program",
    category: "customer_experience",
    name: "Loyalty Program",
    description: "Build customer loyalty. +5 reputation per day.",
    costs: [400, 1000, 2500],
    maxLevel: 3,
    effectType: "reputation_per_day",
    effectPerLevel: 5,
    minShopLevel: 2,
    icon: "⭐",
  },
  {
    id: "display_case_expansion",
    category: "customer_experience",
    name: "Display Case Expansion",
    description: "Showcase more cards. +2 display slots per level.",
    costs: [250, 700, 1800],
    maxLevel: 3,
    effectType: "display_case_slots",
    effectPerLevel: 2,
    minShopLevel: 3,
    icon: "🏆",
  },
  {
    id: "premium_lighting",
    category: "customer_experience",
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
  {
    id: "social_media_presence",
    category: "customer_experience",
    name: "Social Media",
    description: "Online visibility draws more foot traffic. +10% per level.",
    costs: [1500, 3500, 7000],
    maxLevel: 3,
    effectType: "traffic_multiplier",
    effectPerLevel: 0.1,
    minShopLevel: 4,
    icon: "📱",
    prerequisites: ["better_signage"],
  },
  {
    id: "vip_membership",
    category: "customer_experience",
    name: "VIP Membership",
    description: "Regulars feel special and spend more. +5 rep/day per level.",
    costs: [2000, 5000],
    maxLevel: 2,
    effectType: "reputation_per_day",
    effectPerLevel: 5,
    minShopLevel: 5,
    icon: "💳",
    prerequisites: ["loyalty_program"],
  },
  {
    id: "curated_showcase",
    category: "customer_experience",
    name: "Curated Showcase",
    description:
      "Premium display fixtures. +2 display slots and better presentation.",
    costs: [2500, 5500],
    maxLevel: 2,
    effectType: "display_case_slots",
    effectPerLevel: 2,
    minShopLevel: 5,
    icon: "✨",
    prerequisites: ["display_case_expansion"],
  },
  {
    id: "comfort_amenities",
    category: "customer_experience",
    name: "Comfort Amenities",
    description:
      "Seating, AC, and free coffee. Customers linger and tolerate +5% higher prices.",
    costs: [2000, 4500],
    maxLevel: 2,
    effectType: "tolerance_bonus",
    effectPerLevel: 0.05,
    minShopLevel: 6,
    icon: "☕",
    prerequisites: ["premium_lighting"],
  },
  {
    id: "hype_management",
    category: "customer_experience",
    name: "Hype Management",
    description:
      "Community engagement slows hype decay. -15% hype decay per level.",
    costs: [3000, 6000],
    maxLevel: 2,
    effectType: "hype_decay_reduction",
    effectPerLevel: 0.15,
    minShopLevel: 6,
    icon: "🔥",
    prerequisites: ["social_media_presence"],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  BUSINESS — XP, passive income, event revenue
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "training_manual",
    category: "business",
    name: "Training Manual",
    description: "Learn faster from experience. +15% XP per level.",
    costs: [350, 900, 2000],
    maxLevel: 3,
    effectType: "xp_multiplier",
    effectPerLevel: 0.15,
    minShopLevel: 2,
    icon: "📖",
  },
  {
    id: "passive_income_stream",
    category: "business",
    name: "Online Sales Channel",
    description:
      "Earn a trickle of gold from online orders. +25 G/day per level.",
    costs: [1000, 2500, 5000],
    maxLevel: 3,
    effectType: "passive_income",
    effectPerLevel: 25,
    minShopLevel: 3,
    icon: "🌐",
  },
  {
    id: "advanced_training",
    category: "business",
    name: "Advanced Training",
    description:
      "Workshops and mentoring accelerate growth. +15% XP per level.",
    costs: [3000, 7000],
    maxLevel: 2,
    effectType: "xp_multiplier",
    effectPerLevel: 0.15,
    minShopLevel: 5,
    icon: "🎓",
    prerequisites: ["training_manual"],
  },
  {
    id: "event_sponsorship",
    category: "business",
    name: "Event Sponsorship",
    description:
      "Sponsor community events for a revenue boost. +15% event revenue per level.",
    costs: [3500, 7000],
    maxLevel: 2,
    effectType: "event_revenue_bonus",
    effectPerLevel: 0.15,
    minShopLevel: 5,
    icon: "🎪",
  },
  {
    id: "dropshipping",
    category: "business",
    name: "Dropshipping",
    description: "Automated online fulfilment. +50 G/day per level.",
    costs: [5000, 10000],
    maxLevel: 2,
    effectType: "passive_income",
    effectPerLevel: 50,
    minShopLevel: 7,
    icon: "📮",
    prerequisites: ["passive_income_stream"],
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
 * Check whether all prerequisite upgrades are owned (level >= 1).
 */
export function arePrerequisitesMet(
  upgrade: UpgradeDefinition,
  ownedUpgrades: UpgradeState[],
): { met: boolean; missing: string[] } {
  if (!upgrade.prerequisites || upgrade.prerequisites.length === 0) {
    return { met: true, missing: [] };
  }
  const missing: string[] = [];
  for (const reqId of upgrade.prerequisites) {
    const owned = ownedUpgrades.find((u) => u.upgradeId === reqId);
    if (!owned || owned.levelOwned <= 0) {
      missing.push(reqId);
    }
  }
  return { met: missing.length === 0, missing };
}

/**
 * Check if a player can purchase the next level of an upgrade.
 */
export function canPurchaseUpgrade(
  upgrade: UpgradeDefinition,
  currentLevel: number,
  shopLevel: number,
  currency: number,
  // P2-16: Default to [] so prerequisite check is never skipped when called without this arg
  ownedUpgrades: UpgradeState[] = [],
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

  // Check prerequisites
  if (upgrade.prerequisites?.length) {
    const prereqCheck = arePrerequisitesMet(upgrade, ownedUpgrades);
    if (!prereqCheck.met) {
      const missingNames = prereqCheck.missing
        .map((id) => getUpgradeById(id)?.name ?? id)
        .join(", ");
      return {
        canBuy: false,
        reason: `Requires: ${missingNames}`,
      };
    }
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
  /** Passive income per day in gold (additive). */
  passiveIncome: number;
  /** Hype decay reduction factor (multiplicative, e.g. 0.30 = 30% slower decay). */
  hypeDecayReduction: number;
  /** Event revenue bonus (multiplicative, e.g. 0.30 = +30% event revenue). */
  eventRevenueBonus: number;
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
    passiveIncome: 0,
    hypeDecayReduction: 0,
    eventRevenueBonus: 0,
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
      case "passive_income":
        mods.passiveIncome += totalEffect;
        break;
      case "hype_decay_reduction":
        mods.hypeDecayReduction += totalEffect;
        break;
      case "event_revenue_bonus":
        mods.eventRevenueBonus += totalEffect;
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
