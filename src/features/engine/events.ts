/**
 * Event System — semi-random events that modify gameplay.
 *
 * Events fire every 5-10 days. Each event has modifiers that affect
 * traffic, budgets, pricing, wholesale costs, and more.
 *
 * @module features/engine/events
 */

import type { GameEvent, GameEventType, CustomerType } from "@/types/game";

// ── Event Templates ──────────────────────────────────────────────────

interface EventTemplate {
  type: GameEventType;
  name: string;
  description: string;
  minDuration: number;
  maxDuration: number;
  trafficMultiplier: number;
  budgetMultiplier: number;
  priceToleranceMultiplier: number;
  customerTypeBonus: Partial<Record<CustomerType, number>>;
  wholesaleMultiplier: number;
  rarityBoostChance: number;
  xpMultiplier: number;
  /** Minimum shop level required for this event. */
  minShopLevel: number;
  /** Weight for random selection (higher = more common). */
  weight: number;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: "tournament_weekend",
    name: "Tournament Weekend",
    description:
      "A local tournament brings competitive players to your shop looking for packs and singles.",
    minDuration: 2,
    maxDuration: 3,
    trafficMultiplier: 1.5,
    budgetMultiplier: 1.2,
    priceToleranceMultiplier: 1.3,
    customerTypeBonus: { competitive: 20, collector: 5 },
    wholesaleMultiplier: 1.0,
    rarityBoostChance: 0.0,
    xpMultiplier: 1.2,
    minShopLevel: 5,
    weight: 15,
  },
  {
    type: "collector_convention",
    name: "Collector Convention",
    description:
      "Collectors flock to town for a convention. High demand for rare and showcase cards.",
    minDuration: 2,
    maxDuration: 4,
    trafficMultiplier: 1.4,
    budgetMultiplier: 1.5,
    priceToleranceMultiplier: 1.4,
    customerTypeBonus: { collector: 25, whale: 10 },
    wholesaleMultiplier: 1.0,
    rarityBoostChance: 0.02,
    xpMultiplier: 1.3,
    minShopLevel: 3,
    weight: 12,
  },
  {
    type: "holiday_rush",
    name: "Holiday Rush",
    description:
      "The holiday season means more shoppers, bigger budgets, and gift-buying frenzy!",
    minDuration: 3,
    maxDuration: 5,
    trafficMultiplier: 1.8,
    budgetMultiplier: 1.4,
    priceToleranceMultiplier: 1.2,
    customerTypeBonus: { casual: 15, kid: 15 },
    wholesaleMultiplier: 1.0,
    rarityBoostChance: 0.0,
    xpMultiplier: 1.5,
    minShopLevel: 1,
    weight: 10,
  },
  {
    type: "influencer_visit",
    name: "Influencer Visit",
    description:
      "A popular streamer features your shop! Traffic spikes as their followers rush in.",
    minDuration: 1,
    maxDuration: 2,
    trafficMultiplier: 2.0,
    budgetMultiplier: 1.1,
    priceToleranceMultiplier: 1.1,
    customerTypeBonus: { casual: 20, kid: 10 },
    wholesaleMultiplier: 1.0,
    rarityBoostChance: 0.0,
    xpMultiplier: 1.3,
    minShopLevel: 7,
    weight: 8,
  },
  {
    type: "distributor_sale",
    name: "Distributor Sale",
    description:
      "Your distributor is running a promotion — wholesale prices are reduced!",
    minDuration: 2,
    maxDuration: 3,
    trafficMultiplier: 1.0,
    budgetMultiplier: 1.0,
    priceToleranceMultiplier: 1.0,
    customerTypeBonus: {},
    wholesaleMultiplier: 0.8, // 20% discount on wholesale
    rarityBoostChance: 0.0,
    xpMultiplier: 1.0,
    minShopLevel: 2,
    weight: 15,
  },
  {
    type: "supply_shortage",
    name: "Supply Shortage",
    description:
      "Distributor shipments are delayed. Wholesale prices rise, but customers pay more too.",
    minDuration: 2,
    maxDuration: 4,
    trafficMultiplier: 0.8,
    budgetMultiplier: 1.3,
    priceToleranceMultiplier: 1.5,
    customerTypeBonus: { collector: 5 },
    wholesaleMultiplier: 1.3, // 30% more expensive wholesale
    rarityBoostChance: 0.0,
    xpMultiplier: 1.0,
    minShopLevel: 4,
    weight: 10,
  },
  {
    type: "new_set_hype",
    name: "New Set Hype",
    description:
      "A new set announcement drives excitement! Everyone wants the latest cards.",
    minDuration: 3,
    maxDuration: 5,
    trafficMultiplier: 1.6,
    budgetMultiplier: 1.3,
    priceToleranceMultiplier: 1.3,
    customerTypeBonus: { collector: 10, competitive: 10, casual: 5 },
    wholesaleMultiplier: 1.0,
    rarityBoostChance: 0.03,
    xpMultiplier: 1.2,
    minShopLevel: 1,
    weight: 12,
  },
  {
    type: "lucky_week",
    name: "Lucky Week",
    description:
      "Something's in the air... pack openings seem to have better luck this week!",
    minDuration: 3,
    maxDuration: 5,
    trafficMultiplier: 1.1,
    budgetMultiplier: 1.0,
    priceToleranceMultiplier: 1.0,
    customerTypeBonus: {},
    wholesaleMultiplier: 1.0,
    rarityBoostChance: 0.08, // Significant boost to rare pulls
    xpMultiplier: 1.0,
    minShopLevel: 3,
    weight: 8,
  },
  {
    type: "double_xp",
    name: "Double XP Weekend",
    description: "Everything you do earns double experience this weekend!",
    minDuration: 2,
    maxDuration: 3,
    trafficMultiplier: 1.0,
    budgetMultiplier: 1.0,
    priceToleranceMultiplier: 1.0,
    customerTypeBonus: {},
    wholesaleMultiplier: 1.0,
    rarityBoostChance: 0.0,
    xpMultiplier: 2.0,
    minShopLevel: 1,
    weight: 10,
  },
];

// ── Event creation ───────────────────────────────────────────────────

let eventCounter = 0;

function generateEventId(): string {
  eventCounter++;
  return `evt-${Date.now()}-${eventCounter}`;
}

/**
 * Roll a random event for a given day.
 * Respects shop level requirements and avoids recently seen events.
 */
export function rollNewEvent(
  currentDay: number,
  shopLevel: number,
  pastEventIds: string[],
  recentEventTypes: GameEventType[],
  affectedSetCodes?: string[],
): GameEvent | null {
  // Filter eligible templates
  const eligible = EVENT_TEMPLATES.filter((t) => {
    if (t.minShopLevel > shopLevel) return false;
    // Avoid same type appearing twice in recent history
    if (recentEventTypes.includes(t.type)) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // Weighted random selection
  const totalWeight = eligible.reduce((acc, t) => acc + t.weight, 0);
  let roll = Math.random() * totalWeight;

  let selected: EventTemplate | null = null;
  for (const t of eligible) {
    roll -= t.weight;
    if (roll <= 0) {
      selected = t;
      break;
    }
  }

  if (!selected) selected = eligible[eligible.length - 1];

  // Generate duration
  const duration =
    selected.minDuration +
    Math.floor(
      Math.random() * (selected.maxDuration - selected.minDuration + 1),
    );

  const event: GameEvent = {
    id: generateEventId(),
    type: selected.type,
    name: selected.name,
    description: selected.description,
    startDay: currentDay,
    duration,
    trafficMultiplier: selected.trafficMultiplier,
    budgetMultiplier: selected.budgetMultiplier,
    priceToleranceMultiplier: selected.priceToleranceMultiplier,
    customerTypeBonus: { ...selected.customerTypeBonus },
    wholesaleMultiplier: selected.wholesaleMultiplier,
    rarityBoostChance: selected.rarityBoostChance,
    xpMultiplier: selected.xpMultiplier,
    affectedSets: affectedSetCodes ?? [],
  };

  return event;
}

/**
 * Get events that are active on a given day.
 */
export function getActiveEvents(
  events: GameEvent[],
  currentDay: number,
): GameEvent[] {
  return events.filter(
    (e) => currentDay >= e.startDay && currentDay < e.startDay + e.duration,
  );
}

/**
 * Remove expired events and return remaining + expired IDs.
 */
export function cleanupExpiredEvents(
  events: GameEvent[],
  currentDay: number,
): { activeEvents: GameEvent[]; expiredIds: string[] } {
  const active: GameEvent[] = [];
  const expiredIds: string[] = [];

  for (const e of events) {
    if (currentDay < e.startDay + e.duration) {
      active.push(e);
    } else {
      expiredIds.push(e.id);
    }
  }

  return { activeEvents: active, expiredIds };
}

/**
 * Determine if a new event should be scheduled.
 * Events happen every 5-10 days. Returns true if it's time.
 */
export function shouldScheduleEvent(
  currentDay: number,
  lastEventStartDay: number,
  shopLevel: number,
): boolean {
  // Events unlock at shop level 7 (per design doc) but we give some earlier
  // at reduced frequency
  if (shopLevel < 3) return false;

  const daysSinceLastEvent = currentDay - lastEventStartDay;

  // Higher shop levels get events more frequently
  const minGap = shopLevel >= 7 ? 5 : 7;
  const maxGap = shopLevel >= 7 ? 10 : 14;

  if (daysSinceLastEvent < minGap) return false;
  if (daysSinceLastEvent >= maxGap) return true;

  // Random chance between min and max gap
  const chance = (daysSinceLastEvent - minGap) / (maxGap - minGap);
  return Math.random() < chance;
}

/**
 * Get the combined event multipliers for active events.
 * Multiplies all active event multipliers together.
 */
export function getCombinedEventModifiers(activeEvents: GameEvent[]): {
  trafficMultiplier: number;
  budgetMultiplier: number;
  priceToleranceMultiplier: number;
  wholesaleMultiplier: number;
  rarityBoostChance: number;
  xpMultiplier: number;
  customerTypeBonus: Partial<Record<CustomerType, number>>;
} {
  const result = {
    trafficMultiplier: 1.0,
    budgetMultiplier: 1.0,
    priceToleranceMultiplier: 1.0,
    wholesaleMultiplier: 1.0,
    rarityBoostChance: 0.0,
    xpMultiplier: 1.0,
    customerTypeBonus: {} as Partial<Record<CustomerType, number>>,
  };

  for (const e of activeEvents) {
    result.trafficMultiplier *= e.trafficMultiplier;
    result.budgetMultiplier *= e.budgetMultiplier;
    result.priceToleranceMultiplier *= e.priceToleranceMultiplier;
    result.wholesaleMultiplier *= e.wholesaleMultiplier;
    result.rarityBoostChance = Math.min(
      0.25,
      result.rarityBoostChance + e.rarityBoostChance,
    );
    result.xpMultiplier *= e.xpMultiplier;

    // Merge customer type bonuses (additive)
    for (const [ct, bonus] of Object.entries(e.customerTypeBonus)) {
      const key = ct as CustomerType;
      result.customerTypeBonus[key] =
        (result.customerTypeBonus[key] ?? 0) + (bonus ?? 0);
    }
  }

  return result;
}

/**
 * Get recent event types from active events (last 3 events).
 */
export function getRecentEventTypes(events: GameEvent[]): GameEventType[] {
  return events
    .sort((a, b) => b.startDay - a.startDay)
    .slice(0, 3)
    .map((e) => e.type);
}
