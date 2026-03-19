/**
 * Customer Simulation — generates customers, simulates visits, handles offline.
 *
 * Pure functions operating on game state. No side effects.
 *
 * @module features/engine/customers
 */

import type {
  Customer,
  CustomerType,
  CustomerVisitResult,
  GameEvent,
  ProductType,
  ShelfSlot,
  SetHype,
  ProductDefinition,
} from "@/types/game";

import {
  calculateSellPrice,
  willCustomerBuy,
  calculateDailyTraffic,
  getCustomerWeights,
  pickCustomerType,
  calculateAverageHype,
} from "./economy";
import { getHypeMultiplier } from "./hype";
import { getCombinedEventModifiers } from "./events";

// ── Customer Name Pools ──────────────────────────────────────────────

const FIRST_NAMES = [
  "Alex",
  "Sam",
  "Jordan",
  "Casey",
  "Riley",
  "Morgan",
  "Quinn",
  "Avery",
  "Dakota",
  "Emery",
  "Sage",
  "Rowan",
  "Phoenix",
  "River",
  "Ash",
  "Blake",
  "Corey",
  "Drew",
  "Ellis",
  "Finley",
  "Gray",
  "Harper",
  "Indigo",
  "Jules",
  "Kai",
  "Logan",
  "Max",
  "Nico",
];

const LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function randomName(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
  return `${first} ${last}.`;
}

// ── Customer Generation ──────────────────────────────────────────────

/** Budget ranges by customer type [min, max]. */
const BUDGET_RANGES: Record<CustomerType, [number, number]> = {
  casual: [100, 400],
  collector: [300, 1200],
  competitive: [200, 800],
  kid: [50, 200],
  whale: [800, 5000],
};

/** Price tolerance ranges by customer type [min, max]. */
const TOLERANCE_RANGES: Record<CustomerType, [number, number]> = {
  casual: [0.2, 0.5],
  collector: [0.4, 0.8],
  competitive: [0.3, 0.6],
  kid: [0.1, 0.3],
  whale: [0.6, 1.0],
};

/** Patience ranges by customer type [min, max]. */
const PATIENCE_RANGES: Record<CustomerType, [number, number]> = {
  casual: [0.3, 0.6],
  collector: [0.5, 0.9],
  competitive: [0.4, 0.7],
  kid: [0.1, 0.4],
  whale: [0.6, 1.0],
};

/** Product type preferences by customer type. Empty = any. */
const PRODUCT_PREFERENCES: Record<CustomerType, ProductType[]> = {
  casual: ["booster_pack", "starter"],
  collector: ["booster_pack", "booster_box"],
  competitive: ["booster_pack", "booster_box"],
  kid: ["booster_pack", "starter"],
  whale: ["booster_box", "booster_pack"],
};

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

let customerCounter = 0;

/**
 * Generate a single customer.
 *
 * @param preferredSets — set codes this customer is specifically looking for (from active events).
 */
export function generateCustomer(
  type: CustomerType,
  budgetMultiplier: number = 1.0,
  preferredSets: string[] = [],
): Customer {
  customerCounter++;
  const [bMin, bMax] = BUDGET_RANGES[type];
  const [tMin, tMax] = TOLERANCE_RANGES[type];
  const [pMin, pMax] = PATIENCE_RANGES[type];

  return {
    id: `cust-${Date.now()}-${customerCounter}`,
    type,
    name: randomName(),
    budget: Math.round(randomInRange(bMin, bMax) * budgetMultiplier),
    preferredSets,
    preferredProducts: PRODUCT_PREFERENCES[type],
    priceTolerance: Math.round(randomInRange(tMin, tMax) * 100) / 100,
    patience: Math.round(randomInRange(pMin, pMax) * 100) / 100,
  };
}

/**
 * Generate a wave of customers for a day.
 *
 * @param upgradeTrafficBonus — additive traffic multiplier from upgrades
 * @param displayCaseBonus — flat traffic bonus from display case
 */
export function generateCustomerWave(
  shopLevel: number,
  reputation: number,
  activeEvents: GameEvent[],
  setHype: SetHype[],
  shelves: ShelfSlot[],
  productSetMap: Map<string, string>,
  upgradeTrafficBonus: number = 0,
  displayCaseBonus: number = 0,
): Customer[] {
  const avgHype = calculateAverageHype(shelves, setHype, productSetMap);
  const count = calculateDailyTraffic(
    shopLevel,
    reputation,
    activeEvents,
    avgHype,
    upgradeTrafficBonus,
    displayCaseBonus,
  );

  const modifiers = getCombinedEventModifiers(activeEvents);
  const weights = getCustomerWeights(shopLevel);
  const customers: Customer[] = [];

  // Collect affected set codes from active events (for set-specific events).
  // Events with affectedSets bias customers of boosted types toward those sets.
  const eventAffectedSets = activeEvents.flatMap((e) => e.affectedSets);

  for (let i = 0; i < count; i++) {
    const type = pickCustomerType(weights, modifiers.customerTypeBonus);

    // If this customer type gets a bonus from an event that has affectedSets,
    // give a 50% chance of making them prefer those sets.
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
    customers.push(customer);
  }

  return customers;
}

// ── Customer Visit Simulation ────────────────────────────────────────

/**
 * Simulate a single customer visiting the shop.
 * The customer browses shelves (based on patience) and buys if they find
 * something within budget and markup tolerance.
 *
 * @param toleranceBonus — additive tolerance bonus from upgrades (e.g. 0.1)
 */
export function simulateCustomerVisit(
  customer: Customer,
  shelves: ShelfSlot[],
  products: Map<string, ProductDefinition>,
  setHype: SetHype[],
  priceToleranceMod: number = 1.0,
  toleranceBonus: number = 0,
): CustomerVisitResult {
  const hypeBySet = new Map(setHype.map((h) => [h.setCode, h.currentHype]));

  // Determine how many shelves the customer will check (based on patience)
  const maxShelves = Math.max(1, Math.ceil(customer.patience * shelves.length));

  // Shuffle shelves (customers browse randomly)
  const shuffled = [...shelves.entries()]
    .sort(() => Math.random() - 0.5)
    .slice(0, maxShelves);

  let bestShelf: {
    index: number;
    price: number;
    product: ProductDefinition;
  } | null = null;
  let bestSatisfaction = 0;

  for (const [index, shelf] of shuffled) {
    if (!shelf.productId || shelf.quantity <= 0) continue;

    const product = products.get(shelf.productId);
    if (!product) continue;

    // Check if customer is interested in this product type
    if (
      customer.preferredProducts.length > 0 &&
      !customer.preferredProducts.includes(product.productType)
    ) {
      continue;
    }

    // Check set preference
    if (
      customer.preferredSets.length > 0 &&
      !customer.preferredSets.includes(product.setCode)
    ) {
      continue;
    }

    // Calculate effective sell price with hype
    const setHypeValue = hypeBySet.get(product.setCode) ?? 50;
    const hypeMult = getHypeMultiplier(setHypeValue);
    const sellPrice = calculateSellPrice(
      product.sellPriceBase,
      shelf.markup,
      hypeMult,
    );

    // Will they buy?
    const effectiveTolerance = customer.priceTolerance * priceToleranceMod;
    if (
      willCustomerBuy(
        sellPrice,
        product.sellPriceBase,
        customer.budget,
        effectiveTolerance,
        toleranceBonus,
      )
    ) {
      // Calculate satisfaction (lower price = higher satisfaction)
      const priceRatio = sellPrice / product.sellPriceBase;
      const satisfaction = Math.max(0, Math.min(1, 1 - (priceRatio - 1) * 0.5));

      if (!bestShelf || satisfaction > bestSatisfaction) {
        bestShelf = { index, price: sellPrice, product };
        bestSatisfaction = satisfaction;
      }
    }
  }

  if (bestShelf) {
    // Determine how many units to buy (most buy 1, whales/collectors might buy more)
    let quantity = 1;
    if (customer.type === "whale" && customer.budget >= bestShelf.price * 3) {
      quantity = Math.min(
        3,
        shelves[bestShelf.index].quantity,
        Math.floor(customer.budget / bestShelf.price),
      );
    } else if (
      customer.type === "collector" &&
      customer.budget >= bestShelf.price * 2
    ) {
      quantity = Math.min(2, shelves[bestShelf.index].quantity);
    }

    return {
      customer,
      purchased: true,
      productId: bestShelf.product.id,
      quantity,
      revenue: bestShelf.price * quantity,
      satisfaction: bestSatisfaction,
    };
  }

  return {
    customer,
    purchased: false,
    productId: null,
    quantity: 0,
    revenue: 0,
    satisfaction: 0,
  };
}

// ── Offline Simulation ───────────────────────────────────────────────

export interface OfflineSimResult {
  /** Revenue earned while offline. */
  revenue: number;
  /** Products sold: productId → quantity. */
  productsSold: Record<string, number>;
  /** Total items sold. */
  totalItemsSold: number;
  /** Total customers who visited. */
  customersServed: number;
  /** Updated shelves after offline sales. */
  updatedShelves: ShelfSlot[];
  /** Reputation gained. */
  reputationGained: number;
}

/**
 * Simulate offline sales over a period of time.
 *
 * Simplified simulation: we simulate day-by-day at reduced fidelity
 * (fewer customers, no pack opening, no events changing mid-period).
 *
 * @param hours - Hours elapsed (capped at 8)
 * @param shelves - Current shelf state
 * @param shopLevel - Current shop level
 * @param reputation - Current reputation
 * @param activeEvents - Events active during offline period
 * @param setHype - Hype state
 * @param products - Product definitions map
 * @param upgradeTrafficBonus — additive traffic multiplier from upgrades
 * @param displayCaseBonus — flat traffic bonus from display case
 * @param toleranceBonus — additive tolerance bonus from upgrades
 */
export function simulateOfflinePeriod(
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
): OfflineSimResult {
  // Each hour ~ roughly 1/8th of a day's traffic
  const offlineEfficiency = 0.6; // Offline sells at 60% efficiency
  const totalCustomers = Math.round(
    calculateDailyTraffic(
      shopLevel,
      reputation,
      activeEvents,
      calculateAverageHype(shelves, setHype, productSetMap),
      upgradeTrafficBonus,
      displayCaseBonus,
    ) *
      (hours / 8) *
      offlineEfficiency,
  );

  const modifiers = getCombinedEventModifiers(activeEvents);
  const weights = getCustomerWeights(shopLevel);
  const updatedShelves = shelves.map((s) => ({ ...s }));

  let totalRevenue = 0;
  let totalItemsSold = 0;
  let customersServed = 0;
  const productsSold: Record<string, number> = {};

  for (let i = 0; i < totalCustomers; i++) {
    // Check if any shelves still have stock
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

      // Reduce shelf stock
      const shelfIdx = updatedShelves.findIndex(
        (s) => s.productId === result.productId && s.quantity > 0,
      );
      if (shelfIdx >= 0) {
        updatedShelves[shelfIdx] = {
          ...updatedShelves[shelfIdx],
          quantity: updatedShelves[shelfIdx].quantity - result.quantity,
        };
        // Clear shelf if empty
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

  // Reputation gained from satisfied customers
  const reputationGained = Math.floor(totalItemsSold * 0.5);

  return {
    revenue: totalRevenue,
    productsSold,
    totalItemsSold,
    customersServed,
    updatedShelves,
    reputationGained,
  };
}
