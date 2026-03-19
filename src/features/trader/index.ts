/**
 * Card Trader Engine — trade duplicate cards for higher-rarity cards.
 *
 * Trade paths:
 *   Common → Uncommon
 *   Uncommon → Rare
 *   Rare → Epic
 *   Epic → Showcase
 *
 * Trade ratio: 5 cards sacrificed → 1 card of next rarity.
 * Player picks exactly which 5 cards to sacrifice.
 * Keep at least 1 copy of each card (only excess copies are tradeable).
 *
 * Pure functions — no side effects, no React, no store access.
 *
 * @module features/trader
 */

import type {
  CardDefinition,
  CardGameplayMeta,
  CollectionEntry,
  Rarity,
} from "@/types/game";

// ── Constants ────────────────────────────────────────────────────────

/** Number of cards required to make a trade. */
export const TRADE_RATIO = 5;

/** Minimum shop level to unlock the Card Trader. */
export const TRADER_UNLOCK_LEVEL = 3;

/** Valid trade paths: source rarity → target rarity. */
export const TRADE_PATHS: Record<string, Rarity> = {
  common: "uncommon",
  uncommon: "rare",
  rare: "epic",
  epic: "showcase",
};

/** Rarities that can be traded (all except showcase — nothing above it). */
export const TRADEABLE_RARITIES: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
];

// ── Types ────────────────────────────────────────────────────────────

export interface TradeableCard {
  /** The card definition. */
  card: CardDefinition;
  /** How many copies the player owns. */
  copiesOwned: number;
  /** How many excess copies can be traded (copiesOwned - 1). */
  excessCopies: number;
}

export interface TradeLaneInfo {
  /** The source rarity for this trade lane. */
  sourceRarity: Rarity;
  /** The target rarity the player will receive. */
  targetRarity: Rarity;
  /** Total excess copies available across all cards of this rarity. */
  totalExcess: number;
  /** Whether the player has enough excess copies for a trade. */
  canTrade: boolean;
  /** Number of tradeable cards (cards with 2+ copies). */
  tradeableCardCount: number;
}

export interface TradeResult {
  /** The card received from the trade. */
  resultCard: CardDefinition;
  /** Whether this card is new to the collection. */
  isNew: boolean;
}

// ── Core Functions ───────────────────────────────────────────────────

/**
 * Get all tradeable cards for a given rarity.
 * A card is tradeable if the player owns 2+ copies (keeps 1).
 */
export function getTradeableCards(
  collection: CollectionEntry[],
  rarity: Rarity,
  allCards: Map<string, CardDefinition>,
): TradeableCard[] {
  const result: TradeableCard[] = [];

  for (const entry of collection) {
    if (entry.copiesOwned < 2) continue;

    const card = allCards.get(entry.cardId);
    if (!card || card.rarity !== rarity) continue;

    result.push({
      card,
      copiesOwned: entry.copiesOwned,
      excessCopies: entry.copiesOwned - 1,
    });
  }

  // Sort by excess copies descending, then by name
  return result.sort((a, b) => {
    if (b.excessCopies !== a.excessCopies)
      return b.excessCopies - a.excessCopies;
    return a.card.name.localeCompare(b.card.name);
  });
}

/**
 * Get info for all 4 trade lanes (one per tradeable rarity).
 */
export function getTradeLanes(
  collection: CollectionEntry[],
  allCards: Map<string, CardDefinition>,
): TradeLaneInfo[] {
  return TRADEABLE_RARITIES.map((rarity) => {
    const tradeable = getTradeableCards(collection, rarity, allCards);
    const totalExcess = tradeable.reduce((sum, t) => sum + t.excessCopies, 0);
    const targetRarity = TRADE_PATHS[rarity];

    return {
      sourceRarity: rarity,
      targetRarity,
      totalExcess,
      canTrade: totalExcess >= TRADE_RATIO,
      tradeableCardCount: tradeable.length,
    };
  });
}

/**
 * Validate a trade selection.
 *
 * @param selectedCardIds - Exactly 5 card IDs the player wants to sacrifice.
 *   A card ID can appear multiple times if the player wants to sacrifice
 *   multiple copies of the same card.
 * @param sourceRarity - The rarity being traded.
 * @param collection - Player's collection.
 * @param allCards - Card definition lookup.
 *
 * @returns null if valid, or an error message string.
 */
export function validateTrade(
  selectedCardIds: string[],
  sourceRarity: Rarity,
  collection: CollectionEntry[],
  allCards: Map<string, CardDefinition>,
): string | null {
  if (selectedCardIds.length !== TRADE_RATIO) {
    return `Must select exactly ${TRADE_RATIO} cards`;
  }

  // Can't trade showcase (no higher rarity)
  if (!(sourceRarity in TRADE_PATHS)) {
    return `Cannot trade ${sourceRarity} cards`;
  }

  // Count how many times each card is selected
  const selectionCounts = new Map<string, number>();
  for (const id of selectedCardIds) {
    selectionCounts.set(id, (selectionCounts.get(id) ?? 0) + 1);
  }

  // Validate each selected card
  for (const [cardId, count] of selectionCounts) {
    const card = allCards.get(cardId);
    if (!card) return `Card not found: ${cardId}`;
    if (card.rarity !== sourceRarity)
      return `Card ${card.name} is ${card.rarity}, expected ${sourceRarity}`;

    const entry = collection.find((c) => c.cardId === cardId);
    if (!entry) return `Card ${card.name} not in collection`;

    // Must keep at least 1 copy
    if (entry.copiesOwned - count < 1)
      return `Not enough copies of ${card.name} (need to keep 1)`;
  }

  return null;
}

/**
 * Pick a random card from the target rarity pool using pull weights.
 * This is the result card the player receives from a trade.
 */
export function pickTradeResult(
  targetRarity: Rarity,
  allCardsByRarity: CardDefinition[],
  allMeta: Map<string, CardGameplayMeta>,
  ownedCardIds: Set<string>,
): TradeResult {
  if (allCardsByRarity.length === 0) {
    throw new Error(`No cards available at rarity: ${targetRarity}`);
  }

  // Prefer cards the player doesn't own yet (weighted bonus)
  const candidates = allCardsByRarity;

  // Build weight array using pullWeight from meta
  const weights = candidates.map((card) => {
    const meta = allMeta.get(card.id);
    let weight = meta?.pullWeight ?? 50;

    // Bonus weight for cards the player doesn't own (2x more likely)
    if (!ownedCardIds.has(card.id)) {
      weight *= 2;
    }

    return weight;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) {
    // Fallback: pure random
    const idx = Math.floor(Math.random() * candidates.length);
    return {
      resultCard: candidates[idx],
      isNew: !ownedCardIds.has(candidates[idx].id),
    };
  }

  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      return {
        resultCard: candidates[i],
        isNew: !ownedCardIds.has(candidates[i].id),
      };
    }
  }

  // Fallback (shouldn't reach)
  const last = candidates[candidates.length - 1];
  return { resultCard: last, isNew: !ownedCardIds.has(last.id) };
}

/**
 * Execute a full trade: validate, pick result.
 * Returns the trade result or an error string.
 *
 * This is a pure function — the caller (store) applies the state changes.
 */
export function executeTrade(
  selectedCardIds: string[],
  sourceRarity: Rarity,
  collection: CollectionEntry[],
  allCards: Map<string, CardDefinition>,
  allCardsByTargetRarity: CardDefinition[],
  allMeta: Map<string, CardGameplayMeta>,
): TradeResult | string {
  const error = validateTrade(
    selectedCardIds,
    sourceRarity,
    collection,
    allCards,
  );
  if (error) return error;

  const targetRarity = TRADE_PATHS[sourceRarity];
  const ownedCardIds = new Set(collection.map((c) => c.cardId));

  return pickTradeResult(
    targetRarity,
    allCardsByTargetRarity,
    allMeta,
    ownedCardIds,
  );
}
