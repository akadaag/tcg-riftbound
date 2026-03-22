/**
 * Market Trends — B1
 *
 * Generates 1-2 daily modifiers each morning using a day-seeded RNG.
 * Trends act as "weather" — they give the player a reason to adjust
 * markup and featured products each day.
 *
 * Architecture: pure functions, no side effects.
 *
 * @module features/engine/market-trends
 */

import type { CustomerType } from "@/types/game";

// ── MarketTrend interface ────────────────────────────────────────────

export interface MarketTrend {
  /** Unique ID for React key, e.g. "trend-5-collector_surge". */
  id: string;
  /** Human-readable label shown on home page. */
  label: string;
  /** Short description explaining the gameplay effect. */
  description: string;
  /** Category for UI icon/color. */
  category: "traffic" | "tolerance" | "hype" | "budget";
  /** Additive traffic modifier (e.g. +3 flat customers, -2 flat customers). */
  trafficFlat: number;
  /** Multiplicative tolerance modifier (e.g. 0.9 = -10% tolerance). */
  toleranceMult: number;
  /** Additive hype boost to a specific set (0 if not set-related). */
  hypeBoost: number;
  /** Set code affected by hype boost ("" if none). */
  hypeSetCode: string;
  /** Customer type weight bonus (additive, like event bonuses). */
  customerTypeBonus: Partial<Record<CustomerType, number>>;
  /** Budget multiplier (e.g. 1.1 = +10% budgets). */
  budgetMult: number;
}

// ── Seeded RNG (splitmix32) ──────────────────────────────────────────

/**
 * Simple 32-bit seeded PRNG (splitmix32).
 * Returns a function that produces deterministic floats in [0, 1).
 */
function splitmix32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s |= 0;
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    t = t ^ (t >>> 15);
    return (t >>> 0) / 4294967296;
  };
}

// ── Trend Templates ──────────────────────────────────────────────────

interface TrendTemplate {
  id: string;
  label: string;
  description: string;
  category: MarketTrend["category"];
  trafficFlat: number;
  toleranceMult: number;
  hypeBoost: number;
  /** If true, the engine picks a random set for this trend. */
  needsSet: boolean;
  customerTypeBonus: Partial<Record<CustomerType, number>>;
  budgetMult: number;
  /** Minimum shop level for this trend to appear. */
  minLevel: number;
}

const TREND_TEMPLATES: TrendTemplate[] = [
  // Traffic modifiers
  {
    id: "collector_surge",
    label: "Collectors Browsing",
    description: "+20% collector traffic today",
    category: "traffic",
    trafficFlat: 2,
    toleranceMult: 1.0,
    hypeBoost: 0,
    needsSet: false,
    customerTypeBonus: { collector: 15 },
    budgetMult: 1.0,
    minLevel: 1,
  },
  {
    id: "competitive_surge",
    label: "Tournament Prep",
    description: "Competitive players stocking up (+15% competitive traffic)",
    category: "traffic",
    trafficFlat: 1,
    toleranceMult: 1.0,
    hypeBoost: 0,
    needsSet: false,
    customerTypeBonus: { competitive: 12 },
    budgetMult: 1.0,
    minLevel: 3,
  },
  {
    id: "quiet_morning",
    label: "Quiet Day",
    description: "Fewer walk-ins today (-2 traffic)",
    category: "traffic",
    trafficFlat: -2,
    toleranceMult: 1.0,
    hypeBoost: 0,
    needsSet: false,
    customerTypeBonus: {},
    budgetMult: 1.0,
    minLevel: 2,
  },
  {
    id: "family_outing",
    label: "Family Day",
    description: "Kids and casuals flooding in (+25% casual & kid traffic)",
    category: "traffic",
    trafficFlat: 2,
    toleranceMult: 1.0,
    hypeBoost: 0,
    needsSet: false,
    customerTypeBonus: { casual: 10, kid: 15 },
    budgetMult: 1.0,
    minLevel: 1,
  },
  // Tolerance modifiers
  {
    id: "budget_shoppers",
    label: "Budget Shoppers",
    description: "Customers are price-sensitive today (-10% tolerance)",
    category: "tolerance",
    trafficFlat: 0,
    toleranceMult: 0.9,
    hypeBoost: 0,
    needsSet: false,
    customerTypeBonus: {},
    budgetMult: 1.0,
    minLevel: 1,
  },
  {
    id: "payday",
    label: "Payday",
    description:
      "Customers are feeling generous (+10% tolerance, +10% budgets)",
    category: "budget",
    trafficFlat: 0,
    toleranceMult: 1.1,
    hypeBoost: 0,
    needsSet: false,
    customerTypeBonus: {},
    budgetMult: 1.1,
    minLevel: 2,
  },
  {
    id: "bargain_hunters",
    label: "Bargain Hunters",
    description:
      "More customers, but they want deals (+3 traffic, -15% tolerance)",
    category: "tolerance",
    trafficFlat: 3,
    toleranceMult: 0.85,
    hypeBoost: 0,
    needsSet: false,
    customerTypeBonus: {},
    budgetMult: 0.9,
    minLevel: 3,
  },
  // Hype modifiers (set-specific)
  {
    id: "set_trending",
    label: "{SET} Trending",
    description: "{SET} is hot on social media (+15 hype)",
    category: "hype",
    trafficFlat: 1,
    toleranceMult: 1.0,
    hypeBoost: 15,
    needsSet: true,
    customerTypeBonus: {},
    budgetMult: 1.0,
    minLevel: 1,
  },
  {
    id: "set_nostalgia",
    label: "{SET} Nostalgia Wave",
    description:
      "Collectors reminiscing about {SET} (+10 hype, +10% collector traffic)",
    category: "hype",
    trafficFlat: 0,
    toleranceMult: 1.0,
    hypeBoost: 10,
    needsSet: true,
    customerTypeBonus: { collector: 8 },
    budgetMult: 1.0,
    minLevel: 2,
  },
  // Budget modifiers
  {
    id: "whale_sighting",
    label: "Whale Sighting",
    description:
      "A big spender might visit today (+10% whale traffic, +15% budgets)",
    category: "budget",
    trafficFlat: 0,
    toleranceMult: 1.0,
    hypeBoost: 0,
    needsSet: false,
    customerTypeBonus: { whale: 10 },
    budgetMult: 1.15,
    minLevel: 5,
  },
];

// ── Generator ────────────────────────────────────────────────────────

/**
 * Generate daily market trends for a given day.
 *
 * @param day        Current game day number (used as RNG seed)
 * @param shopLevel  Player's shop level (filters out high-level trends)
 * @param setCodes   Available set codes (for set-specific trends)
 * @returns          1-2 MarketTrend objects for the day
 */
export function generateDailyTrends(
  day: number,
  shopLevel: number,
  setCodes: string[],
  setNames: Record<string, string>,
): MarketTrend[] {
  const rng = splitmix32(day * 7919 + 42);

  // Filter templates by shop level
  const eligible = TREND_TEMPLATES.filter((t) => shopLevel >= t.minLevel);
  if (eligible.length === 0) return [];

  // 1 or 2 trends: ~60% chance of 2 trends, 40% chance of 1
  const trendCount = rng() < 0.6 ? 2 : 1;

  const picked: MarketTrend[] = [];
  const usedIds = new Set<string>();
  // Avoid picking two trends from the same category
  const usedCategories = new Set<string>();

  for (let i = 0; i < trendCount; i++) {
    // Filter out already-used IDs and categories
    const available = eligible.filter(
      (t) => !usedIds.has(t.id) && !usedCategories.has(t.category),
    );
    if (available.length === 0) break;

    const idx = Math.floor(rng() * available.length);
    const template = available[idx];
    usedIds.add(template.id);
    usedCategories.add(template.category);

    // Resolve set if needed
    let hypeSetCode = "";
    let label = template.label;
    let description = template.description;

    if (template.needsSet && setCodes.length > 0) {
      const setIdx = Math.floor(rng() * setCodes.length);
      hypeSetCode = setCodes[setIdx];
      const setName = setNames[hypeSetCode] ?? hypeSetCode;
      label = label.replace("{SET}", setName);
      description = description.replace(/\{SET\}/g, setName);
    } else if (template.needsSet) {
      // No sets available, skip this trend
      continue;
    }

    picked.push({
      id: `trend-${day}-${template.id}`,
      label,
      description,
      category: template.category,
      trafficFlat: template.trafficFlat,
      toleranceMult: template.toleranceMult,
      hypeBoost: template.hypeBoost,
      hypeSetCode,
      customerTypeBonus: { ...template.customerTypeBonus },
      budgetMult: template.budgetMult,
    });
  }

  return picked;
}

/**
 * Combine all active market trends into aggregate modifiers.
 * Called by the simulation tick loop to apply trend effects.
 */
export function getCombinedTrendModifiers(trends: MarketTrend[]): {
  trafficFlat: number;
  toleranceMult: number;
  budgetMult: number;
  customerTypeBonus: Partial<Record<CustomerType, number>>;
} {
  let trafficFlat = 0;
  let toleranceMult = 1.0;
  let budgetMult = 1.0;
  const customerTypeBonus: Partial<Record<CustomerType, number>> = {};

  for (const t of trends) {
    trafficFlat += t.trafficFlat;
    toleranceMult *= t.toleranceMult;
    budgetMult *= t.budgetMult;
    for (const [ct, bonus] of Object.entries(t.customerTypeBonus)) {
      const key = ct as CustomerType;
      customerTypeBonus[key] = (customerTypeBonus[key] ?? 0) + (bonus ?? 0);
    }
  }

  return { trafficFlat, toleranceMult, budgetMult, customerTypeBonus };
}
