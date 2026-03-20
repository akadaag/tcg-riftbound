/**
 * Real-Time Simulation Engine — M13
 *
 * Tick-based customer arrival, shelf depletion, and revenue accumulation.
 * One game-day = 12 real-world minutes, split across 4 phases:
 *   Morning (3 min) → Afternoon (3 min) → Evening (3 min) → Night (3 min)
 *
 * Architecture rule: pure functions, no side effects, no React, no store access.
 * UI calls these functions each tick and dispatches results to Zustand.
 *
 * @module features/engine/simulation
 */

import type {
  DayPhase,
  CustomerType,
  GameEvent,
  ShelfSlot,
  SetHype,
  ProductDefinition,
  ShopNotification,
  SaveGame,
  DayReport,
} from "@/types/game";
import {
  PHASE_DURATION_MS,
  DAY_DURATION_MS,
  TICK_INTERVAL_MS,
  ACTIVE_PHASES,
} from "@/types/game";

import {
  calculateDailyTraffic,
  getCustomerWeights,
  pickCustomerType,
  calculateAverageHype,
} from "./economy";
import { getCombinedEventModifiers } from "./events";
import { generateCustomer, simulateCustomerVisit } from "./customers";

// ── Phase helpers ────────────────────────────────────────────────────

/** Ordered phases in a full day cycle. */
const PHASE_ORDER: DayPhase[] = ["morning", "afternoon", "evening", "night"];

/**
 * Given elapsed ms within a day, return the current phase and how many ms
 * have elapsed within that phase.
 */
export function getPhaseAtElapsed(dayElapsedMs: number): {
  phase: DayPhase;
  phaseElapsedMs: number;
  phaseProgressPct: number;
} {
  let remaining = Math.max(0, dayElapsedMs) % DAY_DURATION_MS;
  for (const phase of PHASE_ORDER) {
    const phaseDuration = PHASE_DURATION_MS[phase];
    if (remaining < phaseDuration) {
      return {
        phase,
        phaseElapsedMs: remaining,
        phaseProgressPct: remaining / phaseDuration,
      };
    }
    remaining -= phaseDuration;
  }
  // Shouldn't reach here, but fall back to night
  return { phase: "night", phaseElapsedMs: 0, phaseProgressPct: 0 };
}

/**
 * Overall day progress as a 0–1 fraction.
 */
export function getDayProgress(dayElapsedMs: number): number {
  return Math.min(1, Math.max(0, dayElapsedMs) / DAY_DURATION_MS);
}

/**
 * Compute how many ms into the day each phase starts.
 */
export function getPhaseStartMs(phase: DayPhase): number {
  let offset = 0;
  for (const p of PHASE_ORDER) {
    if (p === phase) return offset;
    offset += PHASE_DURATION_MS[p];
  }
  return 0;
}

// ── Phase traffic profiles ───────────────────────────────────────────

/**
 * Traffic multiplier per phase relative to a day's base traffic.
 * These scale the per-tick arrival probability so total customers across
 * all active phases matches the daily traffic figure.
 */
const PHASE_TRAFFIC_MULTIPLIER: Record<DayPhase, number> = {
  morning: 0.65, // lighter morning crowd
  afternoon: 1.3, // peak
  evening: 1.05, // collector/competitive crowd
  night: 0, // shop closed
};

/**
 * Per-phase bias for customer types. Added on top of the shop-level weights.
 * Keys are customer types; values are additive weight adjustments.
 */
const PHASE_TYPE_BIAS: Record<
  DayPhase,
  Partial<Record<CustomerType, number>>
> = {
  morning: { casual: 10, kid: 15, collector: -5, competitive: -8, whale: -5 },
  afternoon: {}, // neutral
  evening: { collector: 15, competitive: 12, whale: 8, casual: -10, kid: -10 },
  night: {},
};

// ── Tick result ──────────────────────────────────────────────────────

export interface TickResult {
  /** New dayElapsedMs after this tick. */
  newDayElapsedMs: number;
  /** ISO timestamp for lastTickAt. */
  newLastTickAt: string;
  /** Phase after this tick. */
  newPhase: DayPhase;
  /** Whether we just transitioned into a new phase. */
  phaseChanged: boolean;
  /** Previous phase (only meaningful when phaseChanged = true). */
  previousPhase: DayPhase | null;
  /** Whether the night→morning transition just triggered (new day). */
  newDayTriggered: boolean;
  /** Customer visit result this tick (null if no customer arrived). */
  customerVisit: TickCustomerVisit | null;
  /** Updated shelves (only set when a sale occurred). */
  updatedShelves: ShelfSlot[] | null;
  /** Notification to show in the live feed (null if nothing to report). */
  notification: ShopNotification | null;
}

export interface TickCustomerVisit {
  customerName: string;
  customerType: CustomerType;
  purchased: boolean;
  productId: string | null;
  productName: string | null;
  quantity: number;
  revenue: number;
}

// ── Core tick function ────────────────────────────────────────────────

/**
 * Process one simulation tick (called every TICK_INTERVAL_MS).
 *
 * Determines:
 * 1. New elapsed time and phase
 * 2. Whether a customer arrives this tick (probability-based)
 * 3. If they arrive, simulate their visit
 * 4. Whether the day ended (night → morning transition)
 *
 * @param now             Current timestamp in ms (Date.now())
 * @param dayElapsedMs    Elapsed ms within the current day before this tick
 * @param currentPhase    Phase before this tick
 * @param shelves         Current shelf state
 * @param products        Product definition map
 * @param setHype         Hype state
 * @param shopLevel       Current shop level
 * @param reputation      Current reputation
 * @param activeEvents    Active game events
 * @param productSetMap   Maps productId → setCode
 * @param upgradeTrafficBonus  Additive traffic bonus from upgrades
 * @param displayCaseBonus     Flat traffic bonus from display case
 * @param toleranceBonus       Additive tolerance bonus from upgrades
 */
export function processTick(
  now: number,
  dayElapsedMs: number,
  currentPhase: DayPhase,
  shelves: ShelfSlot[],
  products: Map<string, ProductDefinition>,
  setHype: SetHype[],
  shopLevel: number,
  reputation: number,
  activeEvents: GameEvent[],
  productSetMap: Map<string, string>,
  upgradeTrafficBonus: number = 0,
  displayCaseBonus: number = 0,
  toleranceBonus: number = 0,
): TickResult {
  // Advance day elapsed time by one tick
  const newDayElapsedMs = dayElapsedMs + TICK_INTERVAL_MS;

  // Determine new phase
  const { phase: newPhase } = getPhaseAtElapsed(newDayElapsedMs);
  const { phase: oldPhase } = getPhaseAtElapsed(dayElapsedMs);

  const phaseChanged = newPhase !== oldPhase;
  const previousPhase: DayPhase | null = phaseChanged ? oldPhase : null;

  // Detect day rollover: we've completed a full day cycle
  const newDayTriggered =
    phaseChanged && oldPhase === "night" && newPhase === "morning";

  const newLastTickAt = new Date(now).toISOString();

  // No customers during night phase
  if (newPhase === "night") {
    return {
      newDayElapsedMs: newDayTriggered ? 0 : newDayElapsedMs,
      newLastTickAt,
      newPhase,
      phaseChanged,
      previousPhase,
      newDayTriggered,
      customerVisit: null,
      updatedShelves: null,
      notification: null,
    };
  }

  // ── Customer arrival probability ───────────────────────────────────
  // Total daily traffic / (active phase ticks) * phase multiplier
  // Active phase ticks = ticks in morning + afternoon + evening
  const activePhaseMs = ACTIVE_PHASES.reduce(
    (sum, p) => sum + PHASE_DURATION_MS[p],
    0,
  );
  const ticksInActivePhases = activePhaseMs / TICK_INTERVAL_MS;

  const avgHype = calculateAverageHype(shelves, setHype, productSetMap);
  const dailyTraffic = calculateDailyTraffic(
    shopLevel,
    reputation,
    activeEvents,
    avgHype,
    upgradeTrafficBonus,
    displayCaseBonus,
  );

  const phaseMultiplier = PHASE_TRAFFIC_MULTIPLIER[newPhase];
  // Probability that a customer arrives on this tick
  const arrivalProbability =
    (dailyTraffic / ticksInActivePhases) * phaseMultiplier;

  if (Math.random() > arrivalProbability) {
    // No customer this tick
    return {
      newDayElapsedMs,
      newLastTickAt,
      newPhase,
      phaseChanged,
      previousPhase,
      newDayTriggered: false,
      customerVisit: null,
      updatedShelves: null,
      notification: null,
    };
  }

  // ── Customer arrived ───────────────────────────────────────────────
  const modifiers = getCombinedEventModifiers(activeEvents);
  const baseWeights = getCustomerWeights(shopLevel);

  // Merge phase bias into base weights
  const phaseBias = PHASE_TYPE_BIAS[newPhase];
  const effectiveBonuses: Partial<Record<CustomerType, number>> = {
    ...modifiers.customerTypeBonus,
  };
  for (const [ct, bias] of Object.entries(phaseBias) as [
    CustomerType,
    number,
  ][]) {
    effectiveBonuses[ct] = (effectiveBonuses[ct] ?? 0) + bias;
  }

  const eventAffectedSets = activeEvents.flatMap((e) => e.affectedSets);
  const type = pickCustomerType(baseWeights, effectiveBonuses);

  let preferredSets: string[] = [];
  if (
    eventAffectedSets.length > 0 &&
    modifiers.customerTypeBonus[type] !== undefined &&
    Math.random() < 0.5
  ) {
    preferredSets = eventAffectedSets;
  }

  const customer = generateCustomer(
    type,
    modifiers.budgetMultiplier,
    preferredSets,
  );

  const visitResult = simulateCustomerVisit(
    customer,
    shelves,
    products,
    setHype,
    modifiers.priceToleranceMultiplier,
    toleranceBonus,
  );

  let updatedShelves: ShelfSlot[] | null = null;
  let notification: ShopNotification | null = null;

  if (visitResult.purchased && visitResult.productId) {
    // Deduct stock
    const newShelves = shelves.map((s) => ({ ...s }));
    const shelfIdx = newShelves.findIndex(
      (s) => s.productId === visitResult.productId && s.quantity > 0,
    );
    if (shelfIdx >= 0) {
      newShelves[shelfIdx] = {
        ...newShelves[shelfIdx],
        quantity: newShelves[shelfIdx].quantity - visitResult.quantity,
      };
      if (newShelves[shelfIdx].quantity <= 0) {
        newShelves[shelfIdx] = {
          ...newShelves[shelfIdx],
          productId: null,
          quantity: 0,
        };
      }
    }
    updatedShelves = newShelves;

    // Build notification
    const product = products.get(visitResult.productId);
    const productName = product?.name ?? visitResult.productId;
    const qtyStr = visitResult.quantity > 1 ? ` ×${visitResult.quantity}` : "";
    notification = {
      id: `notif-${now}-${Math.random().toString(36).slice(2, 7)}`,
      message: `${customer.name} bought ${productName}${qtyStr} — +${visitResult.revenue.toLocaleString()} G`,
      at: new Date(now).toISOString(),
      type: "sale",
    };

    return {
      newDayElapsedMs,
      newLastTickAt,
      newPhase,
      phaseChanged,
      previousPhase,
      newDayTriggered: false,
      customerVisit: {
        customerName: customer.name,
        customerType: customer.type,
        purchased: true,
        productId: visitResult.productId,
        productName,
        quantity: visitResult.quantity,
        revenue: visitResult.revenue,
      },
      updatedShelves,
      notification,
    };
  }

  // Customer visited but didn't buy
  return {
    newDayElapsedMs,
    newLastTickAt,
    newPhase,
    phaseChanged,
    previousPhase,
    newDayTriggered: false,
    customerVisit: {
      customerName: customer.name,
      customerType: customer.type,
      purchased: false,
      productId: null,
      productName: null,
      quantity: 0,
      revenue: 0,
    },
    updatedShelves: null,
    notification: null,
  };
}

// ── Offline simulation ────────────────────────────────────────────────

export interface OfflineTickResult {
  revenue: number;
  productsSold: Record<string, number>;
  totalItemsSold: number;
  customersServed: number;
  updatedShelves: ShelfSlot[];
  reputationGained: number;
  /** Number of full game-days simulated. */
  daysSimulated: number;
}

/**
 * Simulate offline progress as elapsed real-world time.
 *
 * Converts real hours → game-day fractions → simulated customers.
 * Offline efficiency: 60% of normal traffic.
 * Max: 8 real hours (= up to 40 full game-day equivalents, capped internally).
 *
 * Night phase is included in elapsed time but generates no customers.
 */
export function simulateOfflineTicks(
  hours: number,
  shelves: ShelfSlot[],
  shopLevel: number,
  reputation: number,
  activeEvents: GameEvent[],
  setHype: SetHype[],
  products: Map<string, ProductDefinition>,
  productSetMap: Map<string, string>,
  upgradeTrafficBonus: number = 0,
  displayCaseBonus: number = 0,
  toleranceBonus: number = 0,
): OfflineTickResult {
  const OFFLINE_EFFICIENCY = 0.6;
  const elapsedMs = hours * 60 * 60 * 1000;

  // How many full game-days elapsed offline?
  const fullDays = Math.floor(elapsedMs / DAY_DURATION_MS);
  const partialMs = elapsedMs % DAY_DURATION_MS;

  // Fraction of a day's active phase time in the partial leftover
  const activePhaseMs = ACTIVE_PHASES.reduce(
    (sum, p) => sum + PHASE_DURATION_MS[p],
    0,
  );
  const activeRatio = activePhaseMs / DAY_DURATION_MS;

  // Total "active" ms across offline period
  const totalActiveMs =
    fullDays * activePhaseMs + Math.min(partialMs, activePhaseMs);

  const avgHype = calculateAverageHype(shelves, setHype, productSetMap);
  const dailyTraffic = calculateDailyTraffic(
    shopLevel,
    reputation,
    activeEvents,
    avgHype,
    upgradeTrafficBonus,
    displayCaseBonus,
  );

  // Scale total customers by offline efficiency
  const totalCustomers = Math.round(
    (totalActiveMs / activePhaseMs) * dailyTraffic * OFFLINE_EFFICIENCY,
  );

  const modifiers = getCombinedEventModifiers(activeEvents);
  const weights = getCustomerWeights(shopLevel);
  const updatedShelves = shelves.map((s) => ({ ...s }));

  let totalRevenue = 0;
  let totalItemsSold = 0;
  let customersServed = 0;
  const productsSold: Record<string, number> = {};

  for (let i = 0; i < totalCustomers; i++) {
    const hasStock = updatedShelves.some(
      (s) => s.productId !== null && s.quantity > 0,
    );
    if (!hasStock) break;

    const type = pickCustomerType(weights, modifiers.customerTypeBonus);
    const customer = generateCustomer(type, modifiers.budgetMultiplier);

    const result = simulateCustomerVisit(
      customer,
      updatedShelves,
      products,
      setHype,
      modifiers.priceToleranceMultiplier,
      toleranceBonus,
    );

    customersServed++;

    if (result.purchased && result.productId) {
      totalRevenue += result.revenue;
      totalItemsSold += result.quantity;
      productsSold[result.productId] =
        (productsSold[result.productId] ?? 0) + result.quantity;

      const shelfIdx = updatedShelves.findIndex(
        (s) => s.productId === result.productId && s.quantity > 0,
      );
      if (shelfIdx >= 0) {
        updatedShelves[shelfIdx] = {
          ...updatedShelves[shelfIdx],
          quantity: updatedShelves[shelfIdx].quantity - result.quantity,
        };
        if (updatedShelves[shelfIdx].quantity <= 0) {
          updatedShelves[shelfIdx] = {
            ...updatedShelves[shelfIdx],
            productId: null,
            quantity: 0,
          };
        }
      }
    }
  }

  const reputationGained = Math.floor(totalItemsSold * 0.5);
  const daysSimulated = fullDays + (partialMs > 0 ? 1 : 0);

  return {
    revenue: totalRevenue,
    productsSold,
    totalItemsSold,
    customersServed,
    updatedShelves,
    reputationGained,
    daysSimulated,
  };
}
