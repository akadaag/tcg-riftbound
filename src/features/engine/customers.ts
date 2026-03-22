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
  PriceSentiment,
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

// P3-12: Removed module-level mutable customerCounter.
// ID generation now uses Date.now() + Math.random() to avoid mutable module state.

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
  // P3-12: Use Date.now() + Math.random() for unique IDs without mutable module state
  const custId = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [bMin, bMax] = BUDGET_RANGES[type];
  const [tMin, tMax] = TOLERANCE_RANGES[type];
  const [pMin, pMax] = PATIENCE_RANGES[type];

  return {
    id: custId,
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
 * B3: Classify price sentiment based on how close the price ratio is
 * to the customer's maximum acceptable ratio.
 *
 * position = (priceRatio - 1) / (maxAcceptableRatio - 1)
 *   ≤ 0.40 → "fair price"
 *   ≤ 0.75 → "a bit high"
 *   > 0.75 → "pricey!"
 */
function classifyPriceSentiment(
  priceRatio: number,
  maxAcceptableRatio: number,
): PriceSentiment {
  const range = maxAcceptableRatio - 1;
  if (range <= 0) return priceRatio <= 1 ? "fair price" : "pricey!";
  const position = (priceRatio - 1) / range;
  if (position <= 0.4) return "fair price";
  if (position <= 0.75) return "a bit high";
  return "pricey!";
}

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

  // Shuffle shelves (customers browse randomly) — P3-07: Fisher-Yates for uniform distribution
  const indexed = [...shelves.entries()];
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  const shuffled = indexed.slice(0, maxShelves);

  let bestShelf: {
    index: number;
    price: number;
    product: ProductDefinition;
  } | null = null;
  let bestSatisfaction = 0;
  let bestPriceRatio = 0;
  let bestMaxAcceptableRatio = 0;

  // B3: Track whether the customer saw a relevant product but rejected it on price
  let sawRelevantProduct = false;
  let rejectedOnPrice = false;
  let worstRejectedRatio = 0;
  let worstRejectedMaxRatio = 0;

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

    // This product is relevant to the customer
    sawRelevantProduct = true;

    // Calculate effective sell price with hype
    const setHypeValue = hypeBySet.get(product.setCode) ?? 50;
    const hypeMult = getHypeMultiplier(setHypeValue);
    const sellPrice = calculateSellPrice(
      product.sellPriceBase,
      shelf.markup,
      hypeMult,
    );

    // Compute price ratio and max acceptable ratio for sentiment
    const priceRatio =
      product.sellPriceBase > 0 ? sellPrice / product.sellPriceBase : 1;
    const effectiveTolerance = customer.priceTolerance * priceToleranceMod;
    const maxAcceptableRatio = 1 + (effectiveTolerance + toleranceBonus) * 1.5;

    // Will they buy?
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
      const satisfaction = Math.max(0, Math.min(1, 1 - (priceRatio - 1) * 0.5));

      if (!bestShelf || satisfaction > bestSatisfaction) {
        bestShelf = { index, price: sellPrice, product };
        bestSatisfaction = satisfaction;
        bestPriceRatio = priceRatio;
        bestMaxAcceptableRatio = maxAcceptableRatio;
      }
    } else {
      // B3: Customer rejected this product — track if it was price-related
      // (if within budget but price ratio too high, or over budget)
      rejectedOnPrice = true;
      if (priceRatio > worstRejectedRatio) {
        worstRejectedRatio = priceRatio;
        worstRejectedMaxRatio = maxAcceptableRatio;
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
      priceSentiment: classifyPriceSentiment(
        bestPriceRatio,
        bestMaxAcceptableRatio,
      ),
      leftDueToPrice: false,
    };
  }

  // B3: Determine why the customer didn't buy
  const leftDueToPrice = sawRelevantProduct && rejectedOnPrice;

  return {
    customer,
    purchased: false,
    productId: null,
    quantity: 0,
    revenue: 0,
    satisfaction: 0,
    priceSentiment: leftDueToPrice ? "too expensive" : null,
    leftDueToPrice,
  };
}

// P3-09: simulateOfflinePeriod was dead code — removed.
// The codebase uses simulateOfflineTicks from simulation.ts instead.
