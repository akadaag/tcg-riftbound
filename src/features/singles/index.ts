/**
 * Singles Counter Engine — list individual cards for sale to customers.
 *
 * - Auto-prices from CardGameplayMeta.baseValue × rarity multiplier × hype multiplier
 * - Player adjusts via markup slider (0-100%)
 * - Limited listing slots (start with 5, fixed for now)
 * - Collectors and competitive customers can browse singles (shop level 5+)
 *
 * Pure functions — no side effects, no React, no store access.
 *
 * @module features/singles
 */

import type {
  CardDefinition,
  CardGameplayMeta,
  CollectionEntry,
  Customer,
  Rarity,
  SinglesListing,
} from "@/types/game";

// ── Constants ────────────────────────────────────────────────────────

/** Maximum listing slots (base, fixed for M6). */
export const MAX_SINGLES_SLOTS = 5;

/** Minimum shop level to unlock the Singles Counter. */
export const SINGLES_UNLOCK_LEVEL = 5;

/** Rarity multipliers for singles pricing. */
const RARITY_PRICE_MULTIPLIER: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 2.0,
  rare: 5.0,
  epic: 12.0,
  showcase: 25.0,
};

// ── Types ────────────────────────────────────────────────────────────

export interface ListableCard {
  /** The card definition. */
  card: CardDefinition;
  /** Gameplay meta for this card. */
  meta: CardGameplayMeta;
  /** Copies owned. */
  copiesOwned: number;
  /** Suggested price (auto-calculated). */
  suggestedPrice: number;
}

export interface SinglesSaleResult {
  /** The card ID sold. */
  cardId: string;
  /** Revenue earned. */
  revenue: number;
  /** The customer who bought it. */
  customerType: string;
}

// ── Pricing ──────────────────────────────────────────────────────────

/**
 * Calculate the suggested price for a card as a single.
 *
 * Formula: baseValue × rarityMultiplier × hypeMultiplier
 * Minimum price is always 1.
 */
export function calculateSuggestedPrice(
  baseValue: number,
  rarity: Rarity,
  hypeMultiplier: number = 1.0,
): number {
  const rarityMult = RARITY_PRICE_MULTIPLIER[rarity] ?? 1.0;
  return Math.max(1, Math.round(baseValue * rarityMult * hypeMultiplier));
}

/**
 * Calculate the asking price given a suggested price and markup percentage.
 *
 * @param suggestedPrice - The auto-calculated base price
 * @param markup - Markup percentage (0-100)
 */
export function calculateAskingPrice(
  suggestedPrice: number,
  markup: number,
): number {
  // P4-03: Clamp markup to [0, 100] range
  const clampedMarkup = Math.max(0, Math.min(100, markup));
  return Math.max(1, Math.round(suggestedPrice * (1 + clampedMarkup / 100)));
}

// ── Listing Validation ──────────────────────────────────────────────

/**
 * P4-04: Validate whether a card can be listed on the singles counter.
 *
 * Returns { valid: true } if listable, or { valid: false, reason: string }
 * with a human-readable reason if not.
 */
export function validateListing(
  cardId: string,
  askingPrice: number,
  collection: CollectionEntry[],
  currentListings: SinglesListing[],
  maxSlots: number,
): { valid: true } | { valid: false; reason: string } {
  const entry = collection.find((c) => c.cardId === cardId);
  if (!entry || entry.copiesOwned < 2) {
    return { valid: false, reason: "Need at least 2 copies to list" };
  }
  if (currentListings.some((l) => l.cardId === cardId)) {
    return { valid: false, reason: "Card is already listed" };
  }
  if (currentListings.length >= maxSlots) {
    return { valid: false, reason: "All listing slots are full" };
  }
  if (askingPrice < 1 || !Number.isFinite(askingPrice)) {
    return { valid: false, reason: "Invalid asking price" };
  }
  return { valid: true };
}

// ── Listable Cards ───────────────────────────────────────────────────

/**
 * Get all cards that can be listed on the singles counter.
 *
 * A card is listable if:
 * - Player owns 2+ copies (keep at least 1)
 * - Card is not already listed
 * - Card has gameplay meta (for pricing)
 */
export function getListableCards(
  collection: CollectionEntry[],
  currentListings: SinglesListing[],
  cardLookup: (id: string) => CardDefinition | undefined,
  metaLookup: (id: string) => CardGameplayMeta | undefined,
  hypeMultiplier: number = 1.0,
): ListableCard[] {
  const listedIds = new Set(currentListings.map((l) => l.cardId));
  const result: ListableCard[] = [];

  for (const entry of collection) {
    if (entry.copiesOwned < 2) continue;
    if (listedIds.has(entry.cardId)) continue;

    const card = cardLookup(entry.cardId);
    if (!card) continue;

    const meta = metaLookup(entry.cardId);
    if (!meta) continue;

    const suggestedPrice = calculateSuggestedPrice(
      meta.baseValue,
      card.rarity,
      hypeMultiplier,
    );

    result.push({
      card,
      meta,
      copiesOwned: entry.copiesOwned,
      suggestedPrice,
    });
  }

  // Sort by suggested price descending (show most valuable first)
  return result.sort((a, b) => b.suggestedPrice - a.suggestedPrice);
}

// ── Customer Singles Browsing ────────────────────────────────────────

/**
 * Simulate a customer browsing the singles counter.
 *
 * - Collectors prefer high collectorScore
 * - Competitive prefer high playableScore
 * - Budget and price tolerance still apply
 *
 * Returns the listing the customer would buy, or null.
 */
export function simulateSinglesVisit(
  customer: Customer,
  listings: SinglesListing[],
  metaLookup: (id: string) => CardGameplayMeta | undefined,
  cardLookup: (id: string) => CardDefinition | undefined,
  priceToleranceMod: number = 1.0,
  toleranceBonus: number = 0,
): SinglesSaleResult | null {
  // Only collectors and competitive customers browse singles
  if (customer.type !== "collector" && customer.type !== "competitive") {
    return null;
  }

  if (listings.length === 0) return null;

  // Score each listing for this customer
  type ScoredListing = {
    listing: SinglesListing;
    score: number;
  };

  const scoredListings: ScoredListing[] = [];

  for (const listing of listings) {
    // Budget check
    if (listing.askingPrice > customer.budget) continue;

    const meta = metaLookup(listing.cardId);
    if (!meta) continue;

    const card = cardLookup(listing.cardId);
    if (!card) continue;

    // Price tolerance check
    // For singles, the "base price" is the suggested price
    const suggestedPrice = calculateSuggestedPrice(meta.baseValue, card.rarity);
    const priceRatio = listing.askingPrice / Math.max(1, suggestedPrice);
    const effectiveTolerance =
      customer.priceTolerance * priceToleranceMod + toleranceBonus;
    const maxAcceptableRatio = 1 + effectiveTolerance * 1.5;

    if (priceRatio > maxAcceptableRatio) continue;

    // Interest score based on customer type
    let interestScore = 0;
    if (customer.type === "collector") {
      interestScore = meta.collectorScore;
    } else if (customer.type === "competitive") {
      interestScore = meta.playableScore;
    }

    // Rarity bonus
    const rarityBonus = RARITY_PRICE_MULTIPLIER[card.rarity] ?? 1;

    // Lower price ratio = more attractive
    const priceAttractiveness = Math.max(0, 2 - priceRatio);

    const score = interestScore * rarityBonus * priceAttractiveness;
    if (score > 0) {
      scoredListings.push({ listing, score });
    }
  }

  if (scoredListings.length === 0) return null;

  // Weighted random pick based on score
  const totalScore = scoredListings.reduce((sum, s) => sum + s.score, 0);
  let roll = Math.random() * totalScore;

  for (const { listing, score } of scoredListings) {
    roll -= score;
    if (roll <= 0) {
      return {
        cardId: listing.cardId,
        revenue: listing.askingPrice,
        customerType: customer.type,
      };
    }
  }

  // Fallback
  const last = scoredListings[scoredListings.length - 1];
  return {
    cardId: last.listing.cardId,
    revenue: last.listing.askingPrice,
    customerType: customer.type,
  };
}

/**
 * Simulate singles sales for a batch of customers during a day.
 * Returns the total revenue and list of sales.
 *
 * This mutates the listings array (removes sold items) so each card
 * is only sold once per simulation.
 */
export function simulateDaySinglesSales(
  customers: Customer[],
  listings: SinglesListing[],
  metaLookup: (id: string) => CardGameplayMeta | undefined,
  cardLookup: (id: string) => CardDefinition | undefined,
  priceToleranceMod: number = 1.0,
  toleranceBonus: number = 0,
): { sales: SinglesSaleResult[]; remainingListings: SinglesListing[] } {
  const sales: SinglesSaleResult[] = [];
  let remaining = [...listings];

  for (const customer of customers) {
    if (remaining.length === 0) break;

    const result = simulateSinglesVisit(
      customer,
      remaining,
      metaLookup,
      cardLookup,
      priceToleranceMod,
      toleranceBonus,
    );

    if (result) {
      sales.push(result);
      remaining = remaining.filter((l) => l.cardId !== result.cardId);
    }
  }

  return { sales, remainingListings: remaining };
}
