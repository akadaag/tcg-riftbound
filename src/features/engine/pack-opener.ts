/**
 * Pack Opener — resolves a drop table into actual card pulls.
 *
 * Pure function: given a DropTable + catalog data, returns an array
 * of CardDefinition IDs representing the pulled cards.
 *
 * @module features/engine/pack-opener
 */

import type {
  CardDefinition,
  CardGameplayMeta,
  DropTable,
  DropTableSlot,
  Rarity,
} from "@/types/game";

// ── Types ────────────────────────────────────────────────────────────

export interface PackResult {
  /** The card IDs pulled, in slot order. */
  cardIds: string[];
  /** Detailed pull info for the reveal sequence. */
  pulls: PullResult[];
}

export interface PullResult {
  cardId: string;
  slotLabel: string;
  rarity: Rarity;
  /** Whether this card was already in the player's collection. */
  isDuplicate: boolean;
  /** Whether this is a new unique card discovery. */
  isNew: boolean;
}

// ── Core pack opening ────────────────────────────────────────────────

/**
 * Open a pack by resolving each slot in the drop table.
 *
 * @param dropTable - The drop table to resolve
 * @param allCards - All cards in the catalog (for pool filtering)
 * @param allMeta - Gameplay meta for pull weight
 * @param ownedCardIds - Set of card IDs the player already owns (for dupe detection)
 * @param rarityBoostChance - Extra chance to upgrade rarity (from events)
 */
export function openPack(
  dropTable: DropTable,
  allCards: CardDefinition[],
  allMeta: Map<string, CardGameplayMeta>,
  ownedCardIds: Set<string>,
  rarityBoostChance: number = 0,
): PackResult {
  const pulls: PullResult[] = [];

  for (const slot of dropTable.slots) {
    const slotPulls = resolveSlot(
      slot,
      allCards,
      allMeta,
      ownedCardIds,
      rarityBoostChance,
    );
    pulls.push(
      ...slotPulls.map((p) => ({
        ...p,
        slotLabel: slot.label,
      })),
    );
  }

  return {
    cardIds: pulls.map((p) => p.cardId),
    pulls,
  };
}

/**
 * Resolve a single drop table slot into card pulls.
 */
function resolveSlot(
  slot: DropTableSlot,
  allCards: CardDefinition[],
  allMeta: Map<string, CardGameplayMeta>,
  ownedCardIds: Set<string>,
  rarityBoostChance: number,
): Omit<PullResult, "slotLabel">[] {
  const results: Omit<PullResult, "slotLabel">[] = [];
  const alreadyPulledInSlot = new Set<string>();

  for (let i = 0; i < slot.count; i++) {
    // 1. Pick a rarity from the slot's weights
    let rarity = pickWeightedRarity(slot.rarityWeights);

    // 2. Apply rarity boost (chance to upgrade)
    if (rarityBoostChance > 0 && Math.random() < rarityBoostChance) {
      rarity = upgradeRarity(rarity);
    }

    // 3. Build the eligible card pool for this rarity
    const pool = filterPool(slot.pool, allCards, rarity);

    if (pool.length === 0) {
      // Fallback: try without rarity filter
      const fallbackPool = filterPool(slot.pool, allCards, null);
      if (fallbackPool.length === 0) continue; // Skip this pull entirely
      const card = pickWeightedCard(fallbackPool, allMeta, alreadyPulledInSlot);
      alreadyPulledInSlot.add(card.id);
      results.push({
        cardId: card.id,
        rarity: card.rarity,
        isDuplicate: ownedCardIds.has(card.id),
        isNew: !ownedCardIds.has(card.id),
      });
      continue;
    }

    // 4. Pick a card from the pool using pull weights
    const card = pickWeightedCard(pool, allMeta, alreadyPulledInSlot);
    alreadyPulledInSlot.add(card.id);

    results.push({
      cardId: card.id,
      rarity: card.rarity,
      isDuplicate: ownedCardIds.has(card.id),
      isNew: !ownedCardIds.has(card.id),
    });
  }

  return results;
}

// ── Pool filtering ───────────────────────────────────────────────────

/**
 * Filter cards based on pool criteria and optional rarity override.
 */
function filterPool(
  pool: DropTableSlot["pool"],
  allCards: CardDefinition[],
  rarity: Rarity | null,
): CardDefinition[] {
  return allCards.filter((card) => {
    // Set filter
    if (pool.setCodes && pool.setCodes.length > 0) {
      if (!pool.setCodes.includes(card.setCode)) return false;
    }

    // Rarity filter (from pool definition or override)
    if (rarity !== null) {
      if (card.rarity !== rarity) return false;
    } else if (pool.rarities && pool.rarities.length > 0) {
      if (!pool.rarities.includes(card.rarity)) return false;
    }

    // Card type filter
    if (pool.cardTypes && pool.cardTypes.length > 0) {
      if (!pool.cardTypes.includes(card.cardType)) return false;
    }

    // Supertype filter
    if (pool.supertypes && pool.supertypes.length > 0) {
      if (!card.supertype || !pool.supertypes.includes(card.supertype))
        return false;
    }

    // Showcase variant filter
    if (pool.showcaseVariants && pool.showcaseVariants.length > 0) {
      if (
        card.rarity !== "showcase" ||
        !card.showcaseVariant ||
        !pool.showcaseVariants.includes(card.showcaseVariant)
      )
        return false;
    }

    // Exclude showcase
    if (pool.excludeShowcase && card.rarity === "showcase") {
      return false;
    }

    return true;
  });
}

// ── Weighted random selection ────────────────────────────────────────

/**
 * Pick a rarity based on weighted probabilities.
 */
function pickWeightedRarity(weights: Partial<Record<Rarity, number>>): Rarity {
  const entries = Object.entries(weights) as [Rarity, number][];
  const total = entries.reduce((acc, [, w]) => acc + w, 0);

  if (total === 0) return "common"; // fallback

  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }

  return entries[entries.length - 1][0];
}

/**
 * Pick a card from a pool using gameplay meta pull weights.
 * Tries to avoid duplicates within the same slot.
 */
function pickWeightedCard(
  pool: CardDefinition[],
  allMeta: Map<string, CardGameplayMeta>,
  avoidIds: Set<string>,
): CardDefinition {
  // Try to find a card not already pulled in this slot
  const preferred = pool.filter((c) => !avoidIds.has(c.id));
  const candidates = preferred.length > 0 ? preferred : pool;

  // Build weight array
  const weights = candidates.map((card) => {
    const meta = allMeta.get(card.id);
    return meta?.pullWeight ?? 50; // Default weight if no meta
  });

  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0)
    return candidates[Math.floor(Math.random() * candidates.length)];

  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }

  return candidates[candidates.length - 1];
}

/**
 * Upgrade a rarity to the next tier.
 * common → uncommon → rare → epic → showcase
 */
function upgradeRarity(rarity: Rarity): Rarity {
  switch (rarity) {
    case "common":
      return "uncommon";
    case "uncommon":
      return "rare";
    case "rare":
      return "epic";
    case "epic":
      return "showcase";
    case "showcase":
      return "showcase"; // Can't upgrade further
  }
}

/**
 * Sort pack results for a good reveal sequence:
 * commons first, then uncommons, rares, epics, showcase last.
 */
export function sortForReveal(pulls: PullResult[]): PullResult[] {
  const rarityOrder: Record<Rarity, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    showcase: 4,
  };

  return [...pulls].sort(
    (a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity],
  );
}

// ── Batch pack opening ────────────────────────────────────────────────

export interface BatchPackResult {
  /** All card IDs pulled across all packs. */
  cardIds: string[];
  /** Flat list of all pull results across all packs, in reveal order. */
  pulls: PullResult[];
  /** How many new unique cards were discovered. */
  newCount: number;
  /** How many duplicates were pulled. */
  dupeCount: number;
}

/**
 * Open N packs in a single call.
 * Uses `ownedCardIds` to track new vs. dupe across the batch.
 * Cards pulled in earlier packs of the batch count as "owned" for
 * dupe-detection in later packs.
 *
 * @param count - How many packs to open
 */
export function openPackBatch(
  count: number,
  dropTable: import("@/types/game").DropTable,
  allCards: CardDefinition[],
  allMeta: Map<string, CardGameplayMeta>,
  ownedCardIds: Set<string>,
  rarityBoostChance: number = 0,
): BatchPackResult {
  // Mutable working set so each successive pack knows about earlier pulls
  const seenSet = new Set(ownedCardIds);
  const allPulls: PullResult[] = [];
  let newCount = 0;
  let dupeCount = 0;

  for (let i = 0; i < count; i++) {
    const result = openPack(
      dropTable,
      allCards,
      allMeta,
      seenSet,
      rarityBoostChance,
    );
    for (const pull of result.pulls) {
      const isNew = !seenSet.has(pull.cardId);
      if (isNew) {
        newCount++;
        seenSet.add(pull.cardId);
      } else {
        dupeCount++;
      }
      allPulls.push({ ...pull, isNew, isDuplicate: !isNew });
    }
  }

  return {
    cardIds: allPulls.map((p) => p.cardId),
    pulls: allPulls,
    newCount,
    dupeCount,
  };
}
