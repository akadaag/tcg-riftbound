/**
 * Shop Areas Engine — M14
 *
 * Defines the 8 shop areas, their unlock requirements, build costs,
 * tier upgrades, and the effects each area contributes.
 *
 * Architecture rule: pure functions, no side effects, no React, no store access.
 *
 * @module features/engine/areas
 */

import type { ShopArea, ShopAreaType, AreaEffects } from "@/types/game";

// ── Area definitions ─────────────────────────────────────────────────

export interface AreaTierDefinition {
  tier: number;
  /** Upgrade cost in soft currency (0 for tier 1 = base build cost). */
  cost: number;
  /** Human-readable description of what this tier adds. */
  benefit: string;
}

export interface ShopAreaDefinition {
  id: ShopAreaType;
  name: string;
  description: string;
  icon: string;
  /** Minimum shop level to see and build this area. */
  unlockLevel: number;
  /** Whether this area starts pre-built (no build action needed). */
  builtFromStart: boolean;
  /** Build cost in soft currency. 0 if builtFromStart. */
  buildCost: number;
  /** Maximum upgrade tier. */
  maxTier: number;
  tiers: AreaTierDefinition[];
}

/**
 * All 8 shop area definitions.
 * Three built-in areas start pre-built at level 1 (sales_floor, singles_counter, storage_room).
 * The other five must be purchased when the player meets the unlock level.
 */
export const AREA_DEFINITIONS: ShopAreaDefinition[] = [
  // ── Built-in areas ───────────────────────────────────────────────
  {
    id: "sales_floor",
    name: "Sales Floor",
    description:
      "The heart of your shop — shelves where products are displayed and sold to visiting customers.",
    icon: "🏪",
    unlockLevel: 1,
    builtFromStart: true,
    buildCost: 0,
    maxTier: 4,
    tiers: [
      {
        tier: 1,
        cost: 0,
        benefit: "3 shelf slots (base). Customers can browse and buy.",
      },
      {
        tier: 2,
        cost: 800,
        benefit: "+2 shelf slots, +5% customer traffic.",
      },
      {
        tier: 3,
        cost: 2000,
        benefit:
          "+2 shelf slots, +10% traffic, improved layout boosts conversion.",
      },
      {
        tier: 4,
        cost: 5000,
        benefit:
          "+3 shelf slots, +15% traffic, premium display draws all customer types.",
      },
    ],
  },
  {
    id: "singles_counter",
    name: "Singles Counter",
    description:
      "A dedicated glass counter for selling individual cards to collectors and competitive players.",
    icon: "🃏",
    unlockLevel: 1,
    builtFromStart: true,
    buildCost: 0,
    maxTier: 3,
    tiers: [
      {
        tier: 1,
        cost: 0,
        benefit:
          "5 singles listing slots. Collectors and competitive players browse.",
      },
      {
        tier: 2,
        cost: 1200,
        benefit: "+3 singles slots (8 total), +10% collector traffic.",
      },
      {
        tier: 3,
        cost: 3000,
        benefit:
          "+4 singles slots (12 total), +20% collector/competitive traffic, price tolerance bonus.",
      },
    ],
  },
  {
    id: "storage_room",
    name: "Storage Room",
    description:
      "Back-room storage for your inventory. Expand it to hold more stock.",
    icon: "📦",
    unlockLevel: 1,
    builtFromStart: true,
    buildCost: 0,
    maxTier: 4,
    tiers: [
      {
        tier: 1,
        cost: 0,
        benefit: "Base inventory capacity (200 items).",
      },
      {
        tier: 2,
        cost: 600,
        benefit: "+100 inventory capacity.",
      },
      {
        tier: 3,
        cost: 1500,
        benefit: "+150 inventory capacity.",
      },
      {
        tier: 4,
        cost: 4000,
        benefit: "+200 inventory capacity, shelving system speeds restocking.",
      },
    ],
  },

  // ── Purchasable areas ────────────────────────────────────────────
  {
    id: "tournament_hall",
    name: "Tournament Hall",
    description:
      "A dedicated space for hosting competitive events. Draws competitive players and boosts shop reputation.",
    icon: "🏆",
    unlockLevel: 4,
    builtFromStart: false,
    buildCost: 2500,
    maxTier: 3,
    tiers: [
      {
        tier: 1,
        cost: 2500,
        benefit: "+20% competitive customer traffic, +5 reputation/day.",
      },
      {
        tier: 2,
        cost: 4000,
        benefit:
          "+35% competitive traffic, +10 rep/day, whale customers attend.",
      },
      {
        tier: 3,
        cost: 8000,
        benefit:
          "+50% competitive traffic, +20 rep/day, large events attract regional players.",
      },
    ],
  },
  {
    id: "lounge",
    name: "Lounge",
    description:
      "A comfortable seating area that keeps customers around longer, increasing purchase likelihood.",
    icon: "☕",
    unlockLevel: 5,
    builtFromStart: false,
    buildCost: 1800,
    maxTier: 3,
    tiers: [
      {
        tier: 1,
        cost: 1800,
        benefit: "+100 G passive income/day, +8% casual/kid traffic.",
      },
      {
        tier: 2,
        cost: 3200,
        benefit:
          "+200 G passive income/day, +15% casual/kid traffic, price tolerance bonus.",
      },
      {
        tier: 3,
        cost: 6500,
        benefit:
          "+350 G passive income/day, +25% casual/kid traffic, high dwell time drives impulse buys.",
      },
    ],
  },
  {
    id: "premium_vault",
    name: "Premium Vault",
    description:
      "A secure, climate-controlled showcase for high-value singles. Attracts wealthy collectors and whale customers.",
    icon: "💎",
    unlockLevel: 7,
    builtFromStart: false,
    buildCost: 4000,
    maxTier: 3,
    tiers: [
      {
        tier: 1,
        cost: 4000,
        benefit:
          "+3 extra singles slots for high-value cards, +15% whale customer chance.",
      },
      {
        tier: 2,
        cost: 7000,
        benefit:
          "+5 extra singles slots, +25% whale traffic, whale budgets increased.",
      },
      {
        tier: 3,
        cost: 14000,
        benefit:
          "+8 extra singles slots, +40% whale traffic, prestige attracts regional collectors.",
      },
    ],
  },
  {
    id: "workshop",
    name: "Workshop",
    description:
      "A repair and accessories workshop. Sells sleeves, playmats, and grading services, adding a new product category.",
    icon: "🔧",
    unlockLevel: 8,
    builtFromStart: false,
    buildCost: 3500,
    maxTier: 3,
    tiers: [
      {
        tier: 1,
        cost: 3500,
        benefit:
          "+150 G passive income/day (accessories margin), +2 extra singles slots.",
      },
      {
        tier: 2,
        cost: 6000,
        benefit:
          "+300 G passive income/day, +4 extra singles slots, grading attracts collectors.",
      },
      {
        tier: 3,
        cost: 12000,
        benefit:
          "+500 G passive income/day, +6 extra singles slots, specialist reputation boost +10 rep/day.",
      },
    ],
  },
  {
    id: "online_store",
    name: "Online Store",
    description:
      "Sell to remote customers who never visit in person. Generates a separate stream of traffic and revenue.",
    icon: "🌐",
    unlockLevel: 10,
    builtFromStart: false,
    buildCost: 6000,
    maxTier: 3,
    tiers: [
      {
        tier: 1,
        cost: 6000,
        benefit: "+5 remote customers/day (buy from shelves at full price).",
      },
      {
        tier: 2,
        cost: 10000,
        benefit:
          "+10 remote customers/day, remote customers have higher budgets.",
      },
      {
        tier: 3,
        cost: 20000,
        benefit: "+18 remote customers/day, platform boosts local reputation.",
      },
    ],
  },
];

/** Lookup map for fast access by area id. */
const AREA_DEF_MAP = new Map<ShopAreaType, ShopAreaDefinition>(
  AREA_DEFINITIONS.map((d) => [d.id, d]),
);

/** Get a single area definition by id. */
export function getAreaDefinition(
  id: ShopAreaType,
): ShopAreaDefinition | undefined {
  return AREA_DEF_MAP.get(id);
}

/** Get all area definitions. */
export function getAllAreaDefinitions(): ShopAreaDefinition[] {
  return AREA_DEFINITIONS;
}

// ── Area state helpers ────────────────────────────────────────────────

/**
 * Get the current ShopArea state for a given area type, or undefined if
 * the player hasn't seen/built it yet.
 */
export function getAreaState(
  shopAreas: ShopArea[],
  id: ShopAreaType,
): ShopArea | undefined {
  return shopAreas.find((a) => a.areaId === id);
}

/**
 * Check if an area is built (exists in save and isBuilt = true).
 */
export function isAreaBuilt(shopAreas: ShopArea[], id: ShopAreaType): boolean {
  return shopAreas.some((a) => a.areaId === id && a.isBuilt);
}

/**
 * Get the current tier of a built area. Returns 0 if not built.
 */
export function getAreaTier(shopAreas: ShopArea[], id: ShopAreaType): number {
  const area = shopAreas.find((a) => a.areaId === id && a.isBuilt);
  return area?.tier ?? 0;
}

/**
 * Determine which areas are visible to the player (unlocked by shop level),
 * merging with their current build state.
 */
export function getVisibleAreas(
  shopAreas: ShopArea[],
  shopLevel: number,
): Array<{ definition: ShopAreaDefinition; state: ShopArea | undefined }> {
  return AREA_DEFINITIONS.filter((d) => d.unlockLevel <= shopLevel).map(
    (definition) => ({
      definition,
      state: getAreaState(shopAreas, definition.id),
    }),
  );
}

/**
 * Check whether the player can afford to build an area.
 */
export function canBuildArea(
  shopAreas: ShopArea[],
  id: ShopAreaType,
  softCurrency: number,
  shopLevel: number,
): { canBuild: boolean; reason: string | null } {
  const def = getAreaDefinition(id);
  if (!def) return { canBuild: false, reason: "Area not found" };

  if (shopLevel < def.unlockLevel)
    return {
      canBuild: false,
      reason: `Requires shop level ${def.unlockLevel}`,
    };

  if (isAreaBuilt(shopAreas, id))
    return { canBuild: false, reason: "Already built" };

  if (softCurrency < def.buildCost)
    return {
      canBuild: false,
      reason: `Need ${def.buildCost.toLocaleString()} G`,
    };

  return { canBuild: true, reason: null };
}

/**
 * Check whether the player can afford to upgrade an area to the next tier.
 * P3-15: Added shopLevel validation — area upgrades require meeting the area's unlock level.
 */
export function canUpgradeArea(
  shopAreas: ShopArea[],
  id: ShopAreaType,
  softCurrency: number,
  shopLevel?: number,
): { canUpgrade: boolean; reason: string | null; cost: number } {
  const def = getAreaDefinition(id);
  if (!def) return { canUpgrade: false, reason: "Area not found", cost: 0 };

  // P3-15: Enforce shop level requirement (same as build requirement)
  if (shopLevel !== undefined && shopLevel < def.unlockLevel) {
    return {
      canUpgrade: false,
      reason: `Requires shop level ${def.unlockLevel}`,
      cost: 0,
    };
  }

  const area = shopAreas.find((a) => a.areaId === id && a.isBuilt);
  if (!area) return { canUpgrade: false, reason: "Area not built", cost: 0 };

  const nextTier = area.tier + 1;
  if (nextTier > def.maxTier)
    return { canUpgrade: false, reason: "Already at max tier", cost: 0 };

  const tierDef = def.tiers.find((t) => t.tier === nextTier);
  if (!tierDef)
    return { canUpgrade: false, reason: "Tier data missing", cost: 0 };

  if (softCurrency < tierDef.cost)
    return {
      canUpgrade: false,
      reason: `Need ${tierDef.cost.toLocaleString()} G`,
      cost: tierDef.cost,
    };

  return { canUpgrade: true, reason: null, cost: tierDef.cost };
}

// ── Effect calculation ────────────────────────────────────────────────

/**
 * Aggregate all effects from currently built areas.
 * Called by the simulation and store to apply area bonuses.
 */
export function getAreaEffects(shopAreas: ShopArea[]): AreaEffects {
  const effects: AreaEffects = {
    extraShelfSlots: 0,
    trafficBonus: 0,
    toleranceBonus: 0,
    reputationPerDay: 0,
    passiveIncomePerDay: 0,
    competitiveCustomerBonus: 0,
    whaleCustomerBonus: 0,
    remoteTraffic: 0,
    extraSinglesSlots: 0,
    inventoryCapacityBonus: 0,
  };

  for (const area of shopAreas) {
    if (!area.isBuilt) continue;
    const tier = area.tier;

    switch (area.areaId) {
      case "sales_floor":
        // Tier 1: base (no bonus over STARTING_SHELVES)
        // Tier 2: +2 shelves, +5% traffic
        // Tier 3: +4 shelves, +10% traffic
        // Tier 4: +7 shelves, +15% traffic
        if (tier >= 2) {
          effects.extraShelfSlots += 2;
          effects.trafficBonus += 0.05;
        }
        if (tier >= 3) {
          effects.extraShelfSlots += 2;
          effects.trafficBonus += 0.05;
        }
        if (tier >= 4) {
          effects.extraShelfSlots += 3;
          effects.trafficBonus += 0.05;
        }
        break;

      case "singles_counter":
        // Tier 2: +3 slots
        // Tier 3: +4 more slots, +10% collector traffic, tolerance +0.1
        if (tier >= 2) {
          effects.extraSinglesSlots += 3;
          effects.competitiveCustomerBonus += 5;
        }
        if (tier >= 3) {
          effects.extraSinglesSlots += 4;
          effects.competitiveCustomerBonus += 10;
          effects.toleranceBonus += 0.1;
        }
        break;

      case "storage_room":
        if (tier >= 2) effects.inventoryCapacityBonus += 100;
        if (tier >= 3) effects.inventoryCapacityBonus += 150;
        if (tier >= 4) effects.inventoryCapacityBonus += 200;
        break;

      case "tournament_hall":
        if (tier >= 1) {
          effects.competitiveCustomerBonus += 20;
          effects.reputationPerDay += 5;
        }
        if (tier >= 2) {
          effects.competitiveCustomerBonus += 15;
          effects.reputationPerDay += 5;
          effects.whaleCustomerBonus += 8;
        }
        if (tier >= 3) {
          effects.competitiveCustomerBonus += 15;
          effects.reputationPerDay += 10;
          effects.trafficBonus += 0.1;
        }
        break;

      case "lounge":
        if (tier >= 1) {
          effects.passiveIncomePerDay += 100;
          effects.trafficBonus += 0.08;
        }
        if (tier >= 2) {
          effects.passiveIncomePerDay += 100;
          effects.trafficBonus += 0.07;
          effects.toleranceBonus += 0.05;
        }
        if (tier >= 3) {
          effects.passiveIncomePerDay += 150;
          effects.trafficBonus += 0.1;
        }
        break;

      case "premium_vault":
        if (tier >= 1) {
          effects.extraSinglesSlots += 3;
          effects.whaleCustomerBonus += 15;
        }
        if (tier >= 2) {
          effects.extraSinglesSlots += 5;
          effects.whaleCustomerBonus += 10;
        }
        if (tier >= 3) {
          effects.extraSinglesSlots += 8;
          effects.whaleCustomerBonus += 15;
          effects.trafficBonus += 0.1;
        }
        break;

      case "workshop":
        if (tier >= 1) {
          effects.passiveIncomePerDay += 150;
          effects.extraSinglesSlots += 2;
        }
        if (tier >= 2) {
          effects.passiveIncomePerDay += 150;
          effects.extraSinglesSlots += 2;
        }
        if (tier >= 3) {
          effects.passiveIncomePerDay += 200;
          effects.extraSinglesSlots += 2;
          effects.reputationPerDay += 10;
        }
        break;

      case "online_store":
        if (tier >= 1) effects.remoteTraffic += 5;
        if (tier >= 2) effects.remoteTraffic += 5;
        if (tier >= 3) {
          effects.remoteTraffic += 8;
          effects.reputationPerDay += 5;
        }
        break;
    }
  }

  return effects;
}

// ── Initial state helpers ─────────────────────────────────────────────

/**
 * Create the default shop areas for a new save.
 * The three built-in areas start pre-built at tier 1.
 */
export function createInitialShopAreas(): ShopArea[] {
  return [
    { areaId: "sales_floor", isBuilt: true, tier: 1 },
    { areaId: "singles_counter", isBuilt: true, tier: 1 },
    { areaId: "storage_room", isBuilt: true, tier: 1 },
  ];
}
