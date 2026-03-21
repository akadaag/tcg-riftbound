/**
 * Reputation Tier System — named tiers with cumulative mechanical bonuses.
 *
 * Pure functions — no side effects, no React, no store access.
 * @module features/engine/reputation
 */

// ── Types ────────────────────────────────────────────────────────────

export interface ReputationTier {
  /** Tier level (1-6). */
  level: number;
  /** Display name for this tier. */
  name: string;
  /** Minimum reputation required to reach this tier. */
  threshold: number;
}

/**
 * Cumulative bonuses granted by reputation tier.
 * At a given tier you receive ALL bonuses from that tier and below.
 */
export interface ReputationTierBonuses {
  /** Additive percentage increase to daily customer traffic (e.g. 0.02 = +2%). */
  trafficBonus: number;
  /** Additive percentage increase to customer patience/tolerance (e.g. 0.03 = +3%). */
  toleranceBonus: number;
  /** Flat reputation gained per day from tier bonus. */
  reputationPerDay: number;
  /** Flat passive gold income per day from tier bonus. */
  passiveIncomePerDay: number;
  /** Additive percentage increase to XP earned (e.g. 0.05 = +5%). */
  xpBonus: number;
}

// ── Constants ────────────────────────────────────────────────────────

export const REPUTATION_TIERS: ReputationTier[] = [
  { level: 1, name: "Unknown", threshold: 0 },
  { level: 2, name: "Newcomer", threshold: 50 },
  { level: 3, name: "Established", threshold: 150 },
  { level: 4, name: "Popular", threshold: 400 },
  { level: 5, name: "Famous", threshold: 800 },
  { level: 6, name: "Legendary", threshold: 1500 },
];

/**
 * Per-tier bonus contributions (NOT cumulative — these are added up
 * from tier 1 through the player's current tier).
 */
const TIER_BONUS_INCREMENTS: Record<number, Partial<ReputationTierBonuses>> = {
  1: {}, // Unknown — no bonus
  2: { trafficBonus: 0.02 }, // Newcomer: +2% traffic
  3: { toleranceBonus: 0.03 }, // Established: +3% tolerance
  4: { reputationPerDay: 5 }, // Popular: +5 rep/day
  5: { passiveIncomePerDay: 50 }, // Famous: +50 G/day passive
  6: { xpBonus: 0.05 }, // Legendary: +5% XP
};

// ── Functions ────────────────────────────────────────────────────────

/** Get the current reputation tier for a given reputation value. */
export function getReputationTier(reputation: number): ReputationTier {
  let current = REPUTATION_TIERS[0];
  for (const tier of REPUTATION_TIERS) {
    if (reputation >= tier.threshold) {
      current = tier;
    } else {
      break;
    }
  }
  return current;
}

/**
 * Get cumulative bonuses for a given reputation value.
 * Bonuses from all tiers up to and including the current tier are summed.
 */
export function getReputationTierBonuses(
  reputation: number,
): ReputationTierBonuses {
  const tier = getReputationTier(reputation);

  const bonuses: ReputationTierBonuses = {
    trafficBonus: 0,
    toleranceBonus: 0,
    reputationPerDay: 0,
    passiveIncomePerDay: 0,
    xpBonus: 0,
  };

  for (let lvl = 1; lvl <= tier.level; lvl++) {
    const inc = TIER_BONUS_INCREMENTS[lvl];
    if (!inc) continue;
    bonuses.trafficBonus += inc.trafficBonus ?? 0;
    bonuses.toleranceBonus += inc.toleranceBonus ?? 0;
    bonuses.reputationPerDay += inc.reputationPerDay ?? 0;
    bonuses.passiveIncomePerDay += inc.passiveIncomePerDay ?? 0;
    bonuses.xpBonus += inc.xpBonus ?? 0;
  }

  return bonuses;
}

// P3-10: Removed dead toleranceBonusAdd helper — tolerance accumulation
// is done inline in getReputationTierBonuses() at L95.

/**
 * Get the next tier threshold above the player's current reputation.
 * Returns null if the player is at the maximum tier.
 */
export function getNextTierThreshold(
  reputation: number,
): { nextTier: ReputationTier; remaining: number } | null {
  const currentTier = getReputationTier(reputation);
  const nextIndex = REPUTATION_TIERS.findIndex(
    (t) => t.level === currentTier.level + 1,
  );
  if (nextIndex === -1) return null;
  const nextTier = REPUTATION_TIERS[nextIndex];
  return { nextTier, remaining: nextTier.threshold - reputation };
}
