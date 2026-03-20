/**
 * Event Planner Engine — M17
 *
 * Player-initiated events: plan, prepare, execute, results.
 * All functions are pure — no side effects, no React, no store access.
 *
 * Flow:
 *   1. Player browses available event types
 *   2. Checks requirements (area built, staff role present, gold)
 *   3. Plans event → status "preparing", prep countdown starts
 *   4. Each day advance decrements prepDaysLeft
 *   5. When prepDaysLeft reaches 0 → status "active", inject GameEvent
 *   6. When the injected GameEvent expires → status "completed", record result
 *
 * @module features/engine/event-planner
 */

import type {
  PlannedEvent,
  PlayerEventType,
  PlayerEventResult,
  PlayerEventStatus,
  SaveGame,
  GameEvent,
  GameEventType,
  ShopArea,
  StaffMember,
  StaffRole,
} from "@/types/game";

// ── Unlock level ───────────────────────────────────────────────────────

/** Minimum shop level required to access the Event Planner. */
export const EVENT_PLANNER_UNLOCK_LEVEL = 4;

// ── Event type definitions ─────────────────────────────────────────────

export interface PlayerEventRequirement {
  /** Area that must be built (null = no area requirement). */
  requiredAreaId: string | null;
  /** Staff role that must be hired (null = no staff requirement). */
  requiredStaffRole: StaffRole | null;
  /** Minimum shop level. */
  minShopLevel: number;
}

export interface PlayerEventDefinition {
  type: PlayerEventType;
  name: string;
  icon: string;
  description: string;
  /** Flavour text describing what happens during the event. */
  flavorText: string;
  /** Gold cost to schedule. */
  cost: number;
  /** Prep days before the event fires. */
  prepDays: number;
  /** Duration in game-days once active. */
  duration: number;
  /** Cooldown in game-days after completing (can't run again until this expires). */
  cooldownDays: number;
  requirements: PlayerEventRequirement;
  /** The GameEvent type this injects when it fires. */
  injectsEventType: GameEventType;
  /** Traffic multiplier modifier (stacks on top of base GameEvent). */
  trafficMultiplier: number;
  /** Budget multiplier for customers. */
  budgetMultiplier: number;
  /** Price tolerance multiplier. */
  priceToleranceMultiplier: number;
  /** Bonus to specific customer types (added to normal simulation). */
  competitiveBonus: number;
  whaleBonus: number;
  /** Rarity boost chance for pack openings during the event. */
  rarityBoostChance: number;
  /** XP multiplier during the event. */
  xpMultiplier: number;
  /** Flat reputation gained when event completes. */
  reputationReward: number;
  /** Per-set hype boost applied at event end. */
  hypeBoost: number;
}

export const PLAYER_EVENT_DEFINITIONS: PlayerEventDefinition[] = [
  {
    type: "tournament",
    name: "Tournament",
    icon: "🏆",
    description:
      "Host a competitive tournament. Draws serious players and spenders.",
    flavorText:
      "Brackets, side events, and prize support — word spreads fast in the competitive scene.",
    cost: 500,
    prepDays: 2,
    duration: 2,
    cooldownDays: 5,
    requirements: {
      requiredAreaId: "tournament_hall",
      requiredStaffRole: "specialist",
      minShopLevel: 4,
    },
    injectsEventType: "tournament_weekend",
    trafficMultiplier: 1.6,
    budgetMultiplier: 1.3,
    priceToleranceMultiplier: 1.4,
    competitiveBonus: 30,
    whaleBonus: 10,
    rarityBoostChance: 0.0,
    xpMultiplier: 1.3,
    reputationReward: 15,
    hypeBoost: 8,
  },
  {
    type: "launch_party",
    name: "Launch Party",
    icon: "🎉",
    description:
      "Celebrate a new set with music, giveaways, and first-look packs.",
    flavorText:
      "A fun atmosphere brings in curious collectors and casual fans alike.",
    cost: 300,
    prepDays: 1,
    duration: 2,
    cooldownDays: 4,
    requirements: {
      requiredAreaId: "lounge",
      requiredStaffRole: null,
      minShopLevel: 5,
    },
    injectsEventType: "new_set_hype",
    trafficMultiplier: 1.5,
    budgetMultiplier: 1.2,
    priceToleranceMultiplier: 1.2,
    competitiveBonus: 5,
    whaleBonus: 5,
    rarityBoostChance: 0.02,
    xpMultiplier: 1.2,
    reputationReward: 10,
    hypeBoost: 15,
  },
  {
    type: "sidewalk_sale",
    name: "Sidewalk Sale",
    icon: "🏷️",
    description:
      "Put tables outside and push discounted stock. High volume, lower margins.",
    flavorText:
      "Foot traffic explodes when people see the signs — casual buyers and kids love a deal.",
    cost: 150,
    prepDays: 1,
    duration: 1,
    cooldownDays: 3,
    requirements: {
      requiredAreaId: null,
      requiredStaffRole: "greeter",
      minShopLevel: 4,
    },
    injectsEventType: "holiday_rush",
    trafficMultiplier: 1.8,
    budgetMultiplier: 0.9,
    priceToleranceMultiplier: 0.85,
    competitiveBonus: 0,
    whaleBonus: 0,
    rarityBoostChance: 0.0,
    xpMultiplier: 1.1,
    reputationReward: 5,
    hypeBoost: 3,
  },
  {
    type: "vip_night",
    name: "VIP Night",
    icon: "💎",
    description:
      "Exclusive evening for high-value collectors. Few guests, huge budgets.",
    flavorText:
      "Invitation only. The right crowd spends generously on premium singles.",
    cost: 800,
    prepDays: 2,
    duration: 1,
    cooldownDays: 5,
    requirements: {
      requiredAreaId: "premium_vault",
      requiredStaffRole: "security",
      minShopLevel: 7,
    },
    injectsEventType: "collector_convention",
    trafficMultiplier: 0.6,
    budgetMultiplier: 2.5,
    priceToleranceMultiplier: 1.8,
    competitiveBonus: 0,
    whaleBonus: 40,
    rarityBoostChance: 0.0,
    xpMultiplier: 1.2,
    reputationReward: 20,
    hypeBoost: 5,
  },
  {
    type: "card_signing",
    name: "Card Signing",
    icon: "✍️",
    description:
      "A guest artist or pro player signs cards. Collectors flock in for the experience.",
    flavorText:
      "Signed copies become instant collectibles — your singles counter has never been busier.",
    cost: 350,
    prepDays: 2,
    duration: 1,
    cooldownDays: 4,
    requirements: {
      requiredAreaId: "workshop",
      requiredStaffRole: null,
      minShopLevel: 8,
    },
    injectsEventType: "collector_convention",
    trafficMultiplier: 1.4,
    budgetMultiplier: 1.4,
    priceToleranceMultiplier: 1.3,
    competitiveBonus: 5,
    whaleBonus: 15,
    rarityBoostChance: 0.03,
    xpMultiplier: 1.2,
    reputationReward: 12,
    hypeBoost: 10,
  },
  {
    type: "pack_cracking_stream",
    name: "Pack Cracking Stream",
    icon: "📹",
    description:
      "Live-stream a pack opening session. Online and local fans tune in.",
    flavorText:
      "Chat goes wild on every rare pull. New followers become new customers.",
    cost: 250,
    prepDays: 1,
    duration: 2,
    cooldownDays: 4,
    requirements: {
      requiredAreaId: "online_store",
      requiredStaffRole: null,
      minShopLevel: 10,
    },
    injectsEventType: "influencer_visit",
    trafficMultiplier: 1.7,
    budgetMultiplier: 1.1,
    priceToleranceMultiplier: 1.1,
    competitiveBonus: 10,
    whaleBonus: 5,
    rarityBoostChance: 0.05,
    xpMultiplier: 1.3,
    reputationReward: 10,
    hypeBoost: 12,
  },
];

/** Fast lookup by type. */
const DEFINITION_MAP = new Map<PlayerEventType, PlayerEventDefinition>(
  PLAYER_EVENT_DEFINITIONS.map((d) => [d.type, d]),
);

export function getPlayerEventDefinition(
  type: PlayerEventType,
): PlayerEventDefinition | undefined {
  return DEFINITION_MAP.get(type);
}

export function getAllPlayerEventDefinitions(): PlayerEventDefinition[] {
  return PLAYER_EVENT_DEFINITIONS;
}

// ── Requirement checks ─────────────────────────────────────────────────

export interface RequirementCheck {
  canPlan: boolean;
  reasons: string[];
}

/**
 * Check whether the player meets all requirements to schedule a given event type.
 */
export function checkEventRequirements(
  type: PlayerEventType,
  shopLevel: number,
  softCurrency: number,
  shopAreas: ShopArea[],
  staff: StaffMember[],
  plannedEvents: PlannedEvent[],
  playerEventCooldowns: Partial<Record<PlayerEventType, number>>,
  currentDay: number,
): RequirementCheck {
  const def = getPlayerEventDefinition(type);
  if (!def) return { canPlan: false, reasons: ["Unknown event type"] };

  const reasons: string[] = [];

  // Shop level requirement
  if (shopLevel < def.requirements.minShopLevel) {
    reasons.push(`Requires Shop Level ${def.requirements.minShopLevel}`);
  }

  // Gold cost
  if (softCurrency < def.cost) {
    reasons.push(
      `Need ${def.cost.toLocaleString()} G (you have ${softCurrency.toLocaleString()} G)`,
    );
  }

  // Area requirement
  if (def.requirements.requiredAreaId) {
    const area = shopAreas.find(
      (a) => a.areaId === def.requirements.requiredAreaId && a.isBuilt,
    );
    if (!area) {
      reasons.push(
        `Requires ${def.requirements.requiredAreaId.replace(/_/g, " ")} to be built`,
      );
    }
  }

  // Staff role requirement
  if (def.requirements.requiredStaffRole) {
    const hasRole = staff.some(
      (s) => s.role === def.requirements.requiredStaffRole && s.isActive,
    );
    if (!hasRole) {
      reasons.push(`Requires a ${def.requirements.requiredStaffRole} on staff`);
    }
  }

  // Already have one of this type scheduled/preparing/active?
  const alreadyPending = plannedEvents.some(
    (e) =>
      e.type === type &&
      (e.status === "scheduled" ||
        e.status === "preparing" ||
        e.status === "active"),
  );
  if (alreadyPending) {
    reasons.push("This event is already planned or running");
  }

  // Cooldown check
  const cooldownExpiry = playerEventCooldowns[type];
  if (cooldownExpiry !== undefined && currentDay < cooldownExpiry) {
    const daysLeft = cooldownExpiry - currentDay;
    reasons.push(
      `On cooldown for ${daysLeft} more day${daysLeft > 1 ? "s" : ""}`,
    );
  }

  return { canPlan: reasons.length === 0, reasons };
}

// ── Plan / Cancel ──────────────────────────────────────────────────────

let eventPlannerCounter = 0;

function generatePlanId(): string {
  eventPlannerCounter++;
  return `pe-${Date.now()}-${eventPlannerCounter}`;
}

/**
 * Create a new PlannedEvent. Does NOT validate requirements — call
 * checkEventRequirements first. Returns the new PlannedEvent object.
 */
export function createPlannedEvent(
  type: PlayerEventType,
  currentDay: number,
): PlannedEvent {
  const def = getPlayerEventDefinition(type)!;
  return {
    id: generatePlanId(),
    type,
    name: def.name,
    scheduledOnDay: currentDay,
    targetDay: currentDay + def.prepDays,
    prepDaysLeft: def.prepDays,
    cost: def.cost,
    status: "preparing" as PlayerEventStatus,
    activeEventId: null,
    result: null,
  };
}

/**
 * Cancel a planned event. Returns the updated event with status "cancelled".
 * Only cancels if the event is in "preparing" status.
 * Gold is NOT refunded (by design — sunk cost teaches planning).
 */
export function cancelPlannedEvent(event: PlannedEvent): PlannedEvent {
  if (event.status !== "preparing") return event;
  return { ...event, status: "cancelled" };
}

// ── Day advance integration ────────────────────────────────────────────

let gameEventCounter = 0;

function generateGameEventId(): string {
  gameEventCounter++;
  return `pe-evt-${Date.now()}-${gameEventCounter}`;
}

export interface EventPlannerDayResult {
  /** Updated list of planned events (prep decremented, newly fired, completed). */
  updatedPlannedEvents: PlannedEvent[];
  /** New GameEvents to inject (for events that just fired). */
  newGameEvents: GameEvent[];
  /** Updated cooldowns map. */
  updatedCooldowns: Partial<Record<PlayerEventType, number>>;
  /** Reputation reward from events that completed this day advance. */
  reputationReward: number;
  /** Hype boost to apply to all sets from completing events. */
  hypeBoost: number;
  /** Lifetime hosted count increment. */
  newlyHosted: number;
}

/**
 * Process all planned events for the day advance (night → morning).
 *
 * For each planned event:
 * - "preparing": decrement prepDaysLeft; if 0, fire → inject GameEvent, set "active"
 * - "active": check if the injected GameEvent has expired; if so, resolve results → "completed"
 *
 * Returns a full result object with all mutations described.
 */
export function processPlannedEventsForDay(
  plannedEvents: PlannedEvent[],
  nextDay: number,
  activeGameEvents: GameEvent[],
  cooldowns: Partial<Record<PlayerEventType, number>>,
): EventPlannerDayResult {
  const updatedPlannedEvents: PlannedEvent[] = [];
  const newGameEvents: GameEvent[] = [];
  const updatedCooldowns = { ...cooldowns };
  let reputationReward = 0;
  let hypeBoost = 0;
  let newlyHosted = 0;

  for (const planned of plannedEvents) {
    const def = getPlayerEventDefinition(planned.type);
    if (!def) {
      updatedPlannedEvents.push(planned);
      continue;
    }

    switch (planned.status) {
      case "preparing": {
        const newPrepDaysLeft = planned.prepDaysLeft - 1;
        if (newPrepDaysLeft <= 0) {
          // Fire the event — inject into GameEvent system
          const gameEvent: GameEvent = buildGameEvent(def, nextDay);
          newGameEvents.push(gameEvent);
          updatedPlannedEvents.push({
            ...planned,
            prepDaysLeft: 0,
            status: "active",
            activeEventId: gameEvent.id,
            targetDay: nextDay,
          });
        } else {
          updatedPlannedEvents.push({
            ...planned,
            prepDaysLeft: newPrepDaysLeft,
          });
        }
        break;
      }

      case "active": {
        // Check if the injected GameEvent has expired
        const gameEventStillActive = activeGameEvents.some(
          (ge) => ge.id === planned.activeEventId,
        );
        if (!gameEventStillActive) {
          // Event finished — calculate results and set completed
          const result = calculateEventResult(def, nextDay);
          reputationReward += result.reputationGained;
          hypeBoost += def.hypeBoost;
          newlyHosted += 1;
          // Set cooldown: nextDay + cooldownDays
          updatedCooldowns[planned.type] = nextDay + def.cooldownDays;
          updatedPlannedEvents.push({
            ...planned,
            status: "completed",
            result: {
              revenueBonus: result.estimatedRevenue,
              customersAttracted: result.customersAttracted,
              reputationGained: result.reputationGained,
              hypeBoost: def.hypeBoost,
              xpBonus: result.xpBonus,
            },
          });
        } else {
          updatedPlannedEvents.push(planned);
        }
        break;
      }

      default:
        // cancelled / completed — keep as-is (we retain history for the UI)
        updatedPlannedEvents.push(planned);
        break;
    }
  }

  return {
    updatedPlannedEvents,
    newGameEvents,
    updatedCooldowns,
    reputationReward,
    hypeBoost,
    newlyHosted,
  };
}

// ── GameEvent builder ──────────────────────────────────────────────────

/**
 * Build the GameEvent that gets injected into the normal event system
 * when a planned event fires.
 */
function buildGameEvent(
  def: PlayerEventDefinition,
  startDay: number,
): GameEvent {
  return {
    id: generateGameEventId(),
    type: def.injectsEventType,
    name: def.name,
    description: def.flavorText,
    startDay,
    duration: def.duration,
    trafficMultiplier: def.trafficMultiplier,
    budgetMultiplier: def.budgetMultiplier,
    priceToleranceMultiplier: def.priceToleranceMultiplier,
    customerTypeBonus:
      def.competitiveBonus > 0 || def.whaleBonus > 0
        ? {
            ...(def.competitiveBonus > 0
              ? { competitive: def.competitiveBonus }
              : {}),
            ...(def.whaleBonus > 0 ? { whale: def.whaleBonus } : {}),
          }
        : {},
    wholesaleMultiplier: 1.0,
    rarityBoostChance: def.rarityBoostChance,
    xpMultiplier: def.xpMultiplier,
    affectedSets: [],
  };
}

// ── Result calculation ─────────────────────────────────────────────────

interface ResolvedEventResult {
  estimatedRevenue: number;
  customersAttracted: number;
  reputationGained: number;
  xpBonus: number;
}

/**
 * Calculate summary results for a completed player event.
 * This is a lightweight estimate (not real simulation) — just flavour
 * numbers to show in the results modal.
 */
function calculateEventResult(
  def: PlayerEventDefinition,
  _completedDay: number,
): ResolvedEventResult {
  // Rough estimates based on event definition
  const baseCustomers = Math.round(10 * def.trafficMultiplier * def.duration);
  const estimatedRevenue = Math.round(def.cost * 2.5 * def.trafficMultiplier);

  return {
    estimatedRevenue,
    customersAttracted: baseCustomers,
    reputationGained: def.reputationReward,
    xpBonus: Math.round(20 * def.xpMultiplier),
  };
}

// ── Availability helpers ───────────────────────────────────────────────

/**
 * Get all event definitions visible to a player at their shop level.
 */
export function getAvailableEventDefinitions(
  shopLevel: number,
): PlayerEventDefinition[] {
  return PLAYER_EVENT_DEFINITIONS.filter(
    (d) => shopLevel >= d.requirements.minShopLevel,
  );
}

/**
 * Get all currently active / pending planned events (not completed/cancelled).
 */
export function getActivePlannedEvents(
  plannedEvents: PlannedEvent[],
): PlannedEvent[] {
  return plannedEvents.filter(
    (e) => e.status === "preparing" || e.status === "active",
  );
}

/**
 * Get completed player events sorted newest first.
 */
export function getCompletedPlannedEvents(
  plannedEvents: PlannedEvent[],
): PlannedEvent[] {
  return plannedEvents
    .filter((e) => e.status === "completed")
    .sort((a, b) => b.scheduledOnDay - a.scheduledOnDay);
}

/**
 * Check whether the player has completed at least one event of any type.
 * Used by missions.
 */
export function countCompletedPlayerEvents(save: SaveGame): number {
  return save.totalPlayerEventsHosted ?? 0;
}
